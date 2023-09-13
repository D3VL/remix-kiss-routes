// concepts
// _layout.tsx files define the layout of the page, they should contain a <Outlet /> component where child routes are rendered.
// index.tsx files are dedicated for index routes
// $ is used to define dynamic routes, for example /blog/$slug will match /blog/hello-world and /blog/another-post
// + suffix is used to squish out a folder, i.e. make it invisible to the route, for example /legal-pages+/privacy-policy will match /privacy-policy 
// . is used to define virtual folders, for example /users.$id.edit will match /users/123/edit
// [] is used to escape special characters, for example /make-[$$$]-fast-online will match /make-$$$-fast-online
// files not ending in .tsx, .jsx, .ts, .js are ignored, allowing you to keep assets and other files in the same folder as your routes.

import { DefineRouteFunction } from "@remix-run/dev/dist/config/routes"
import { adoptRoutes, getCollisionHash, getRouteId, getRoutePath, getRouteSegments, recursivelyFindFiles } from "./utils"
import { InternalConfigRoute, RemixKissRoutesOptions, SegmentInfo } from "./types"
import path from "path"

const defaultOptions: RemixKissRoutesOptions = {
    app: './app',
    routes: 'routes',
    caseSensitive: false,
    variableCharacter: '$',
    flattenCharacter: '+',
    delimiterCharacter: '.',
    layoutFileName: '_layout',
    indexFileName: 'index',
}

export type DefineRoutesFunction = (
    callback: (route: DefineRouteFunction) => void,
) => any

const routeModuleExts = ['.js', '.jsx', '.ts', '.tsx', '.md', '.mdx']
const serverRegex = /\.server\.(ts|tsx|js|jsx|md|mdx)$/

export default function kissRoutes(defineRoutes: DefineRoutesFunction, userOptions?: RemixKissRoutesOptions): void {

    const options = { ...defaultOptions, ...userOptions } as RemixKissRoutesOptions;
    const files = recursivelyFindFiles(path.join(options.app, options.routes))
        .map(filePath => path.relative(options.app, filePath)) // make paths relative to app
        .filter(filePath => filePath.match(serverRegex) === null) // remove server files
        .filter(filePath => routeModuleExts.includes(path.extname(filePath))); // remove non-route files

    const configRoutes = new Map<string, InternalConfigRoute>();

    for (const file of files) {
        const routeSegments = getRouteSegments(file, options);
        const lastSegment = routeSegments[routeSegments.length - 1];
        const isIndex = lastSegment?.value === options.indexFileName;
        const isLayout = lastSegment?.value === options.layoutFileName;
        const collisionHash = getCollisionHash(Array.from(routeSegments));

        // check for collisions
        if (configRoutes.has(collisionHash)) {
            throw new Error(`Conflicting route found: ${file} <-> ${configRoutes.get(collisionHash)?.file}`);
        }

        configRoutes.set(collisionHash, {
            path: isLayout ? undefined : getRoutePath(Array.from(routeSegments), options).replace(/^\//, ''),
            index: isIndex,
            caseSensitive: options.caseSensitive,
            id: getRouteId(Array.from(routeSegments)),
            parentId: undefined,
            file,
            // custom 
            isLayout,
            segments: Array.from(routeSegments),
            collisionHash,
        } as InternalConfigRoute);
    }

    const adopted = adoptRoutes(Array.from(configRoutes.values()));

    const doDefineRoutes = (defineRoute: DefineRouteFunction, parentId?: string) => {
        const parent = adopted.find(route => route.id === parentId) ?? {
            id: 'root',
            path: undefined,
            parentId: undefined,
            collisionHash: 'root',
            segments: [] as SegmentInfo[],
            isLayout: false,
        } as InternalConfigRoute;

        const routes = adopted.filter(route => route.parentId === parent.id);

        for (const route of routes) {
            const relativePath = parent ? route?.path?.slice((parent?.path ?? '').length) : route.path ?? route.path;

            defineRoute(relativePath, route.file, {
                caseSensitive: route.caseSensitive,
                index: route.index,
            }, () => {
                doDefineRoutes(defineRoute, route.id);
            })
        }
    }

    return defineRoutes(doDefineRoutes)
}

export { kissRoutes }