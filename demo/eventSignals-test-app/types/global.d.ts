//
/**
* Необходимо для работы с типизацией css-modules для плагина
* [typescript-plugin-css-modules]{@link https://www.npmjs.com/package/typescript-plugin-css-modules/v/3.4.0#custom-definitions}
*/
declare module '*.module.css' {
    // eslint-disable-next-line callforce/typescript__no_declaration_in_dts
    const classes: { [key: string]: string };

    export default classes;
}

declare module '*.scss' {
    // eslint-disable-next-line callforce/typescript__no_declaration_in_dts
    const classes: { [key: string]: string };

    export default classes;
}

declare module '*.module.sass' {
    // eslint-disable-next-line callforce/typescript__no_declaration_in_dts
    const classes: { [key: string]: string };

    export default classes;
}

declare module '*.module.less' {
    // eslint-disable-next-line callforce/typescript__no_declaration_in_dts
    const classes: { [key: string]: string };

    export default classes;
}

declare module '*.module.styl' {
    // eslint-disable-next-line callforce/typescript__no_declaration_in_dts
    const classes: { [key: string]: string };

    export default classes;
}
