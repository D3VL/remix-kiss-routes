import * as fs from 'fs'
import * as path from 'path'

import {
    RouteInfo,
    parserState,
    parserChar,
    SegmentInfo,
    SegmentType,
} from './types'

import {
    pathIdVariableHolder
} from './const'


export function getRouteMap(segments: SegmentInfo[], replaceVariable?: string | undefined, variableChar?: string | undefined): string[] {
    let routeMap: string[] = []
    let chunk: string[] = []

    for (const segment of segments) {
        if (segment.type === SegmentType.IGNORE) continue
        if (segment.type === SegmentType.OPTIONAL_PARAM) replaceVariable ? chunk.push(replaceVariable) : chunk.push(`${variableChar ?? ':'}(${segment.value})`)
        if (segment.type === SegmentType.PARAM) replaceVariable ? chunk.push(replaceVariable) : chunk.push(`${variableChar ?? ':'}${segment.value}`)
        if (segment.type === SegmentType.PLAIN) chunk.push(segment.value)
        if (segment.type === SegmentType.DELIMITER) routeMap.push(chunk.join('')), chunk = []
    }

    // push the last chunk
    routeMap.push(chunk.join(''))

    return routeMap
}

// for internal use, catches duplicate routes
export function getFileId(segments: SegmentInfo[]): string {
    let map = getRouteMap(segments, pathIdVariableHolder)
    return map.join('/')
}

// for useRouteLoaderData hook, keeps the route id consistent with filenames
export function getLoaderId(segments: SegmentInfo[]): string {
    let map = getRouteMap(segments, undefined, '$')
    return map.join('/')
}

// for the web address that the browser sees
export function getRoutePath(segments: SegmentInfo[]): string {
    let map = getRouteMap(segments)
    // if last element is index or _index, remove it
    if (map[map.length - 1] === 'index' || map[map.length - 1] === '_index') map.pop()

    // if last element is _layout return empty string
    if (map[map.length - 1] === '_layout') map.pop()

    return map.join('/')
}

export function recursivelyFindFiles(
    dir: string,
    ignoredFilePatterns: RegExp[],
    maxDepth?: number | 10,
    depth?: number | 0,
): string[] {

    if (depth === undefined) depth = 0
    if (maxDepth === undefined) maxDepth = 10

    if (depth >= maxDepth) return []

    const files = fs.readdirSync(dir)
    const foundFiles: string[] = []

    for (let file of files) {
        const filePath = path.join(dir, file)

        if (fs.statSync(filePath).isDirectory()) {
            foundFiles.push(...recursivelyFindFiles(filePath, ignoredFilePatterns, maxDepth, depth + 1))
        } else {
            if (ignoredFilePatterns.some(pattern => filePath.match(pattern))) continue
            foundFiles.push(filePath)
        }
    }

    return foundFiles;
}

export const getRouteSegments = (_path: string): SegmentInfo[] => {

    // check if path contains pathIdVariableHolder if so,throw error
    if (_path.includes(pathIdVariableHolder)) throw new Error(`Path ${_path} contains ${pathIdVariableHolder} which is a reserved variable holder`)

    // strip extension from path
    const { ext } = path.parse(_path)
    _path = _path.slice(0, _path.length - ext.length)

    // create a list for our segments
    const segments: SegmentInfo[] = [];

    // initialize state and segment
    let STATE = parserState.START;
    let SEGMENT = {
        value: '',
        type: SegmentType.PLAIN
    } as SegmentInfo;

    // save the current segment to the list and reset the segment
    const commitSegment = (newType?: SegmentType) => {
        // if SEGMENT.value ends with FLATTEN, then we can skip this
        if (SEGMENT.value !== '' && !SEGMENT.value.endsWith(parserChar.FLATTEN)) segments.push(SEGMENT);
        SEGMENT = {
            value: '',
            type: newType || SegmentType.PLAIN
        } as SegmentInfo;
    }

    // add a delimiter to the list
    const addDelimiter = (value: string) => {
        // if length of segments is 0, then we can skip this
        if (segments.length === 0) return;
        // if last item was delimiter of the same value, then we can skip this
        if (segments.length > 0 && segments[segments.length - 1].value === value && segments[segments.length - 1].type === SegmentType.DELIMITER) return;
        segments.push({
            value,
            type: SegmentType.DELIMITER
        } as SegmentInfo)
    }

    for (const char of _path) {

        if (char === ':') throw new Error('Cannot use ":" in path ' + _path);
        if (char === '?') throw new Error('Cannot use "?" in path ' + _path);
        if (char === '*') throw new Error('Cannot use "*" in path ' + _path);


        if ((char === path.sep || char === parserChar.DOT) && STATE !== parserState.IN_IGNORE) {
            // this is a path separator, if we're still at the START state, then we can skip this 
            if (STATE === parserState.START) continue;

            // if SEGMENT is empty, then we can skip this
            if (SEGMENT.value !== '') commitSegment()
            addDelimiter(char)
            continue;
        }

        if (char === parserChar.IGNORE_END && STATE === parserState.IN_IGNORE) {
            // we're at the end of an optional segment, so we can push the current segment and reset the state
            commitSegment()
            STATE = parserState.IN_PLAIN;
            continue;
        }

        if (STATE === parserState.IN_IGNORE) {
            // we're in an optional segment, so we can just add the char to the current segment
            SEGMENT.value += char;
            continue;
        }

        if (char === parserChar.IGNORE_START) {
            if (STATE === parserState.IN_OPTIONAL) {
                throw new Error('Cannot nest optional segments in ' + path);
            }
            STATE = parserState.IN_IGNORE;
            continue;
        }

        if (STATE === parserState.IN_PARAM || STATE === parserState.IN_OPTIONAL_PARAM) {
            // check this char to see if it's a valid param char, a-z, A-Z, 0-9
            if (char.match(/[a-zA-Z0-9_]/)) {
                SEGMENT.value += char;
                continue;
            }

            // if it's not a valid param char, then we need to push the current segment and reset the state
            commitSegment()
        }


        if (char === parserChar.PARAM) {
            // flush the current segment
            commitSegment()

            if (STATE === parserState.IN_OPTIONAL) {
                SEGMENT.type = SegmentType.OPTIONAL_PARAM;
                STATE = parserState.IN_OPTIONAL_PARAM;
            } else {
                SEGMENT.type = SegmentType.PARAM;
                STATE = parserState.IN_PARAM;
            }
            continue;
        }

        if (char === parserChar.OPTIONAL_START) {
            STATE = parserState.IN_OPTIONAL;
            continue;
        }

        if (char === parserChar.OPTIONAL_END) {
            commitSegment()
            STATE = parserState.IN_PLAIN;
            continue;
        }

        STATE = parserState.IN_PLAIN;
        SEGMENT.value += char;
    }

    // push the last segment
    commitSegment()

    return segments;
}

export const adoptRoutes = (routes: RouteInfo[]): RouteInfo[] => {

    for (const route of routes) {
        let parentCandidate = undefined;
        let segments = route.segments.slice(0);
        while (segments.length !== 0 && !parentCandidate) {
            segments.pop();
            const layoutId = getFileId([
                ...segments,
                { value: '_layout', type: SegmentType.PLAIN } as SegmentInfo
            ])

            parentCandidate = routes.find(r => (r.fileId === layoutId && r.fileId !== route.fileId));
        }

        // set the parent 
        route.parent = parentCandidate ?? {
            fileId: 'root',
            filePath: '',
            urlPath: '',
            segments: [],
        } as RouteInfo;
    }

    return routes;
}
