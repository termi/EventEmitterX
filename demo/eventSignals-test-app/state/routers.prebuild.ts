'use strict';

import type { EventSignal } from '~/modules/EventEmitterEx/EventSignal';
import type * as React from "react";

const routersList: {
    position: number,
    pageTitle: string,
    srcPath: string,
    routerPath: string,
    importPath: string,
    menuHidden?: boolean,
    metadata?: {
        menuItemTitle: string,
        menuItemTitle$: EventSignal<string>,
    },
    Component: React.FC,
    Layout?: React.FC,
}[] = [];

export { routersList };

export async function onBuild({ projectRoot, thisFilepath }: { projectRoot: string, thisFilepath: string }) {
    const path = require('node:path') as typeof import('node:path');
    const fs = require('node:fs') as typeof import('node:fs');
    const pagesDir = path.join(projectRoot, 'pages');

    for (const file of fs.readdirSync(pagesDir)) {
        const fileext = path.extname(file);

        if (fileext !== '.tsx' && fileext !== '.jsx') {
            continue;
        }

        const filename = path.basename(file, fileext);

        if (filename === 'Page404') {
            routersList.push({
                position: -1,
                pageTitle: '404',
                srcPath: file,
                routerPath: '(.*)',
                importPath: `./pages/${filename}${fileext}`,
                menuHidden: true,
                Component() {
                    return null;
                },
            });

            continue;
        }

        const positionMatch = filename.match(/^(\d+)\./);
        const positionString = positionMatch?.[1] || '';
        const position = positionString ? Number.parseInt(positionString, 10) || 0 : 0;
        const routerPath = positionMatch
            ? filename.substring(positionMatch[0].length)
            : filename
        ;

        routersList.push({
            position,
            pageTitle: routerPath,
            srcPath: file,
            routerPath: `/${routerPath}`,
            importPath: `./pages/${filename}${fileext}`,
            Component() {
                return null;
            },
        });
    }

    routersList.sort((a, b) => {
        return a.position - b.position;
    });

    let moduleBody = '';
    const moduleInitializer = routersList.reduce((moduleInitializer, routerDescription, index) => {
        const { importPath } = routerDescription;

        moduleBody += `routersList[${index}].Component = React.lazy(() => import('${(path.relative(path.dirname(thisFilepath), importPath))
            .replace(/\\/g, '/')}'));`;

        const ext = path.extname(importPath);
        const basename = path.basename(importPath, ext);
        const metadataBasename = `${path.dirname(importPath)}/${basename}.metadata.ts`;
        const metadataFilepath = path.join(projectRoot, metadataBasename);

        if (!fs.existsSync(metadataFilepath)) {
            return moduleInitializer;
        }

        const metadataImportPath = (path.relative(path.dirname(thisFilepath), metadataFilepath))
            .replace(/\\/g, '/')
        ;

        // console.log('metadataImport', { thisFilepath, importPath, metadataBasename, metadataFilepath, metadataImportPath });

        moduleBody += `\nroutersList[${index}].metadata = metadata_${index};`;

        return `${moduleInitializer}
import * as metadata_${index} from '${metadataImportPath}';`;
    }, `"use strict";
import * as React from 'react';
`);

    return {
        beforeCode: moduleInitializer,
        afterCode: moduleBody,
    };
}
