import type {
    RouteManifest,
    ConfigRoute
} from '@remix-run/dev/dist/config/routes'

import type {
    RouteInfo
} from './types'

import {
    recursivelyFindFiles,
    getRouteSegments,
    getFileId,
    getRoutePath,
    adoptRoutes,
    getLoaderId
} from './utils'

import {
    indexRouteRegex,
    routeModuleExts,
    serverRegex,
} from './const'

import * as path from 'path'

export default function kissRoutes(
    appDir: string,
    routeDir: string,
): RouteManifest | undefined {

    const routeMap: Map<string, RouteInfo> = new Map()

    const files = [];

    const folder = path.join(appDir, routeDir)
    const found = recursivelyFindFiles(folder, [], 10, 0)
        .map(filePath => path.relative(folder, filePath)) // get relative path
        .filter(filePath => filePath.match(serverRegex) === null) // remove server files
        .filter(filePath => routeModuleExts.includes(path.extname(filePath))); // remove non-route files


    if (found.length) files.push(...found)
    else throw new Error(`No routes found in ${routeDir}`)

    for (const file of files) {

        // get the sections from the File
        const routeSegments = getRouteSegments(file);
        const lastSegment = routeSegments[routeSegments.length - 1];
        const routeInfo = {
            fileId: getFileId(routeSegments),
            filePath: path.join(routeDir, file),
            urlPath: `/${getRoutePath(routeSegments)}`,
            segments: routeSegments,
            layout: (lastSegment.value === '_layout'),
            index: (lastSegment.value.match(indexRouteRegex) !== null),
            parentId: undefined,
            children: [],
        } as RouteInfo;

        // check if routeMap already has a routeInfo with the same file|Id
        if (routeMap.has(routeInfo.fileId)) {
            throw new Error(`⚠️ Duplicate route found: ${routeInfo.filePath}`);
        }

        routeMap.set(routeInfo.fileId, routeInfo);
    }

    // const entry = nestRoutes(Array.from(routeMap.values()));
    const adoptedRoutes = adoptRoutes(Array.from(routeMap.values()));

    // map our nestedLayouts to ConfigRoute 
    const manifest: RouteManifest = {};

    for (const routeInfo of adoptedRoutes) {
        const relativePath = routeInfo.urlPath
            .slice((routeInfo.parent?.urlPath ?? '').length) // remove parent path
            .replace(/^\//, ''); // remove leading slash
        const parentId = routeInfo.parent?.segments ? getLoaderId(routeInfo.parent.segments) : 'root';
        const route: ConfigRoute = {
            path: relativePath,
            index: routeInfo.index,
            caseSensitive: false,
            id: routeInfo.fileId,
            parentId,
            file: routeInfo.filePath,
        }

        manifest[getLoaderId(routeInfo.segments)] = route;
    }

    return manifest
}
export { kissRoutes }

