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
    getLoaderId,
    hasConflictingRoutes
} from './utils'

import {
    indexRouteRegex,
    routeModuleExts,
    serverRegex,
} from './const'

import * as path from 'path'

export default function kissRoutes(
    appDir: string,
    routeDirs: string[] | string | ['routes']
): RouteManifest | undefined {

    if (typeof routeDirs === 'string') routeDirs = [routeDirs]
    if (!routeDirs.length) routeDirs = ['routes']

    const routeMap = new Map() as Map<string, RouteInfo>;

    for (const routeDir of routeDirs) {

        const folder = path.join(appDir, routeDir)
        const files = recursivelyFindFiles(folder, [], 10, 0)
            .map(filePath => path.relative(folder, filePath)) // get relative path
            .filter(filePath => filePath.match(serverRegex) === null) // remove server files
            .filter(filePath => routeModuleExts.includes(path.extname(filePath))); // remove non-route files

        if (!files.length) throw new Error(`No routes found in ${routeDir}`)

        for (const file of files) {

            // get the sections from the File
            const routeSegments = getRouteSegments(file);
            const lastSegment = routeSegments[routeSegments.length - 1];

            if (hasConflictingRoutes(routeSegments, routeMap)) {
                throw new Error(`⚠️   Conflicting route found: ${path.join(routeDir, file)}`);
            }

            const routeInfo = {
                fileId: getFileId(routeSegments),
                filePath: path.join(routeDir, file),
                urlPath: `/${getRoutePath(routeSegments)}`,
                segments: routeSegments,
                layout: (lastSegment.value === '_layout'),
                index: (lastSegment.value.match(indexRouteRegex) !== null),
                routeDir
            } as RouteInfo;

            routeMap.set(routeInfo.fileId, routeInfo);
        }
    }

    // const entry = nestRoutes(Array.from(routeMap.values()));
    const adoptedRoutes = adoptRoutes(Array.from(routeMap.values()));

    // map our nestedLayouts to ConfigRoute 
    const manifest = {} as RouteManifest;

    for (const routeInfo of adoptedRoutes) {
        const relativePath = routeInfo.urlPath
            .slice((routeInfo.parent?.urlPath ?? '').length) // remove parent path
            .replace(/^\//, ''); // remove leading slash

        const parentId = routeInfo.parent?.segments.length
            ? getLoaderId(routeInfo.parent.segments, routeInfo.parent.routeDir)
            : 'root';

        const loaderId = getLoaderId(routeInfo.segments, routeInfo.routeDir);

        const route = {
            path: relativePath,
            index: routeInfo.index,
            caseSensitive: false,
            id: loaderId,
            parentId: parentId ?? 'root',
            file: routeInfo.filePath,
        } as ConfigRoute;

        manifest[loaderId] = route;
    }

    return manifest
}
export { kissRoutes }

