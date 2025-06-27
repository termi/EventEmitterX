





// Вспомогательная функция для объединения частей URL
function pathJoin(...parts: string[]): string {
    return parts.map(part => part.replace(/^\/|\/$/g, '')).join('/');
}
