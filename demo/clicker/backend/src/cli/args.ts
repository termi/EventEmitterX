'use strict'

function parseArgs() {
    const args = process.argv.slice(2);
    const params: Record<string, string | boolean> = Object.create(null);

    args.forEach(arg => {
        if (arg.startsWith("--")) {
            const [key, value] = arg.slice(2).split("=");
            // Если значение не указано (--debug), то true
            params[key] = value || true;
        }
    });

    return params;
}

export const cliArgs = parseArgs();
