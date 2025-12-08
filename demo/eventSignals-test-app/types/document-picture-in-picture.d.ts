// https://github.com/BenjaminAster/TypeScript-types-for-new-JavaScript/blob/main/wicg/document-picture-in-picture.d.ts

// Document Picture-in-Picture
// Specification: https://wicg.github.io/document-picture-in-picture/
// Repository: https://github.com/WICG/document-picture-in-picture

declare var documentPictureInPicture: DocumentPictureInPicture;

declare class DocumentPictureInPicture extends EventTarget {
    requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
    readonly window: Window;
    onenter: ((this: DocumentPictureInPicture, event_: DocumentPictureInPictureEvent) => any) | null;
    addEventListener<K extends keyof DocumentPictureInPictureEventMap>(type: K, listener: (this: DocumentPictureInPicture, event_: DocumentPictureInPictureEventMap[K]) => any, options?: AddEventListenerOptions | boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    removeEventListener<K extends keyof DocumentPictureInPictureEventMap>(type: K, listener: (this: DocumentPictureInPicture, event_: DocumentPictureInPictureEventMap[K]) => any, options?: EventListenerOptions | boolean): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean): void;
}

interface DocumentPictureInPictureEventMap {
    "center": DocumentPictureInPictureEvent;
}

interface DocumentPictureInPictureOptions {
    width?: number;
    height?: number;
    initialAspectRatio?: number;
    lockAspectRatio?: boolean;
    copyStyleSheets?: boolean;
}

declare class DocumentPictureInPictureEvent {
    constructor(type: string, eventInitDict: DocumentPictureInPictureEventInit);
    readonly window: Window;
}

interface DocumentPictureInPictureEventInit {
    window: Window;
}
