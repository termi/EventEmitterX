import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'EventEmitterX',
    description: 'Cross-platform EventEmitter and Reactive Signals for TypeScript',
    base: '/EventEmitterX/',
    cleanUrls: true,
    ignoreDeadLinks: [/\/demo\//],

    head: [
        ['link', { rel: 'icon', href: '/EventEmitterX/favicon.ico' }],
    ],

    themeConfig: {
        siteTitle: 'EventEmitterX',

        nav: [
            { text: 'Home', link: '/' },
            { text: 'EventEmitterX', link: '/eventemitterx' },
            { text: 'EventSignal', link: '/eventsignal' },
            { text: 'Demo ↗', link: '/demo/', target: '_blank' },
        ],

        sidebar: [
            {
                text: 'Getting Started',
                items: [
                    { text: 'Overview', link: '/' },
                ],
            },
            {
                text: 'API Reference',
                items: [
                    { text: 'EventEmitterX', link: '/eventemitterx' },
                    { text: 'EventSignal', link: '/eventsignal' },
                ],
            },
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/termi/EventEmitterX' },
        ],

        footer: {
            message: 'Released under the ISC License.',
            copyright: 'Copyright © termi',
        },

        outline: {
            level: [2, 3],
            label: 'On this page',
        },

        search: {
            provider: 'local',
        },
    },
});


