'use strict';

import type { NavigationRouter } from "./routing";

const routersList: NavigationRouter[] = [];
const router404: NavigationRouter = {
    key: '',
    position: -1,
    pageTitle: '404',
    srcPath: '',
    routerPath: '',
    importPath: '',
    menuHidden: true,
    Component() {
        return null;
    },
};

export { routersList, router404 };

export async function onBuild({ projectRoot, thisFilepath }: { projectRoot: string, thisFilepath: string }) {
    const path = require('node:path') as typeof import('node:path');
    const fs = require('node:fs') as typeof import('node:fs');
    const crypto = require('node:crypto') as typeof import('node:crypto');
    const hashSum = (strings: string[]) => {
        const hash = crypto.createHash('md5');

        for (const string of strings) {
            hash.update(string);
        }

        return hash.digest('hex').toString();
    };
    const pagesDir = path.join(projectRoot, 'pages');
    const specialPages = Object.create(null) as Record<string, NavigationRouter>;
    const page404 = 'Page404';

    for (const file of fs.readdirSync(pagesDir)) {
        const fileext = path.extname(file);

        if (fileext !== '.tsx' && fileext !== '.jsx') {
            continue;
        }

        const filename = path.basename(file, fileext);

        if (filename === page404) {
            const routerPath = '(.*)';
            const importPath = `./pages/${filename}${fileext}`;
            const key = hashSum([ routerPath, importPath, file ]);

            routersList.push(specialPages[page404] = {
                key,
                position: -1,
                pageTitle: '404',
                srcPath: file,
                routerPath,
                importPath,
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
        const importPath = `./pages/${filename}${fileext}`;

        routersList.push({
            key: hashSum([ routerPath, importPath, file ]),
            position,
            pageTitle: routerPath,
            srcPath: file,
            routerPath: `/${routerPath}`,
            importPath,
            Component() {
                return null;
            },
        });
    }

    routersList.sort((a, b) => {
        return a.position - b.position;
    });

    const reassignmentVariables = Object.create(null) as Record<string, string>;

    // Небольшой костыль, пока не придумал как сделать лучше
    if (specialPages[page404]) {
        reassignmentVariables["router404"] = `routersList.find(router => router.key === '${specialPages[page404].key}')`;
    }

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
        reassignmentVariables,
    };
}
