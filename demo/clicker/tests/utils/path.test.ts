'use strict';

import { describe, it } from "@jest/globals";

import { createRoute, createRouteWithQuery, pathJoin } from "../../utils/path";

describe('utils/path', function() {
    const origin = 'http://localhost/pathname'

    describe('createRoute', function() {
        it('cases', function() {
            expect(pathJoin('http://localhost/', '/test/')).toBe('http://localhost/test/');
            expect(pathJoin('http://localhost', '/test/')).toBe('http://localhost/test/');
            expect(pathJoin('http://localhost', 'test/')).toBe('http://localhost/test/');
        });
    });

    describe('createRoute', function() {
        it('with none params', function() {
            expect(createRoute(origin, '/test')).toBe(origin + '/test');
        });

        it('with single param', function() {
            expect(createRoute(origin, '/:id', { id: 10 })).toBe(origin + '/10');
        });

        it('with multi params', function() {
            expect(createRoute(origin, '/:id/action/:actionName', {
                id: 10,
                actionName: 'send',
            })).toBe(origin + '/10/action/send');
        });
    });

    describe('createRouteWithQuery', function() {
        it('with none params', function() {
            expect(createRouteWithQuery(origin, '/test')).toBe(origin + '/test');
        });

        it('with single param', function() {
            expect(createRouteWithQuery(origin, '/:id', { id: 10 })).toBe(origin + '/10');
        });

        it('with multi params', function() {
            expect(createRouteWithQuery(origin, '/:id/action/:actionName', {
                id: 10,
                actionName: 'send',
            })).toBe(origin + '/10/action/send');
        });

        it('with single GET param', function() {
            expect(createRouteWithQuery(origin, '?id=:id', { id: 10 })).toBe(origin + '?id=10');
            expect(createRouteWithQuery(origin, '/test?id=:id', { id: 10 })).toBe(origin + '/test?id=10');
            expect(createRouteWithQuery(origin, '/?id=:id', { id: 10 })).toBe(origin + '/?id=10');
            expect(createRouteWithQuery(origin, 'test/?id=:id', { id: 10 })).toBe(origin + '/test/?id=10');
            expect(createRouteWithQuery(origin, '?:id', { id: 10 })).toBe(origin + '?10');
            expect(createRouteWithQuery(origin, 'test?:id', { id: 10 })).toBe(origin + '/test?10');
            expect(createRouteWithQuery(origin, '/?:id', { id: 10 })).toBe(origin + '/?10');
            expect(createRouteWithQuery(origin, 'test/?:id', { id: 10 })).toBe(origin + '/test/?10');
        });

        it('with GET params', function() {
            expect(createRouteWithQuery(origin, '/?:id', { id: '' })).toBe(origin + '/');
            expect(createRouteWithQuery(origin, '/?:id&type=:type', { id: '', type: 'sort' })).toBe(origin + '/?type=sort');
        });

        it('with single param and single GET param', function() {
            expect(createRouteWithQuery(origin, '/:id/?type=:type', { id: 10, type: 'hidden' })).toBe(origin + '/10/?type=hidden');
            expect(createRouteWithQuery(origin, '/:id?type=:type', { id: 10, type: 'hidden' })).toBe(origin + '/10?type=hidden');
        });
    });
});
