'use strict';

import path from "node:path";

/**
 * @see [Client]{@link import('../../../lib/dev/css-hot-reload-client.js')}
 */
export function createCSSHotReloadConfirmPlugin() {
    return {
        name: 'css-hot-reload-confirm',

        handleHotUpdate({ file, server: viteServer, modules }) {
            // Проверяем, является ли файл CSS
            if (file.endsWith('.css')) {
                // console.log(`[CSS Hot Reload] CSS file changed: ${file}`);

                // Находим CSS модуль
                const cssModule = modules.find(m => m.file === file);

                if (cssModule) {
                    // Получаем относительный путь для отображения
                    const { root } = viteServer.config;
                    const relativePath = path.relative(root, file).replace(/\\/g, '/');

                    // Отправляем кастомное сообщение клиенту
                    viteServer.ws.send({
                        type: 'custom',
                        event: 'css-update-available',
                        data: {
                            file: file,
                            filename: path.basename(file),
                            relativePath: relativePath,
                            timestamp: Date.now(),
                        },
                    });

                    // Возвращаем пустой массив, чтобы предотвратить стандартную перезагрузку
                    return [];
                }
            }

            // Для всех других файлов - стандартное поведение
            return modules;
        },
    };
}
