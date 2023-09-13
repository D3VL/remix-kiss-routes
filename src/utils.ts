import * as fs from 'fs'
import * as path from 'path'
import { InternalConfigRoute, RemixKissRoutesOptions, SegmentInfo, SegmentType, parserChar, parserState } from './types'

const pathIdVariableHolder = '%%VARIABLE%%'

export function recursivelyFindFiles(
    dir: string,
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
            foundFiles.push(...recursivelyFindFiles(filePath, maxDepth, depth + 1))
        } else {
            foundFiles.push(filePath)
        }
    }

    return foundFiles;
}


export const getRouteSegments = (_path: string, options: RemixKissRoutesOptions): SegmentInfo[] => {

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
        // if SEGMENT.value ends with FLATTEN then SEGMENT.type = HIDDEN
        if (SEGMENT.value.endsWith((options.flattenCharacter ?? parserChar.FLATTEN))) SEGMENT.type = SegmentType.HIDDEN;
        if (SEGMENT.value === '' && SEGMENT.type === SegmentType.PARAM) SEGMENT.type = SegmentType.SPLAT;

        if (SEGMENT.value !== '' || SEGMENT.type === SegmentType.SPLAT) {
            segments.push(SEGMENT);
        }

        SEGMENT = {
            value: '',
            type: newType || SegmentType.PLAIN
        } as SegmentInfo;
        STATE = parserState.IN_PLAIN;
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


        if (char === path.sep || (char === (options.delimiterCharacter ?? parserChar.DOT) && STATE !== parserState.IN_IGNORE)) {
            // this is a path separator, if we're still at the START state, then we can skip this 
            if (STATE === parserState.START) continue;

            commitSegment()
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
            STATE = parserState.IN_IGNORE;
            continue;
        }

        if (STATE === parserState.IN_PARAM) {
            // check this char to see if it's a valid param char, a-z, A-Z, 0-9
            if (char.match(/[a-zA-Z0-9_]/)) {
                SEGMENT.value += char;
                continue;
            }

            // if it's not a valid param char, then we need to push the current segment and reset the state
            commitSegment()
        }


        if (char === (options.variableCharacter ?? parserChar.PARAM)) {
            // flush the current segment
            commitSegment()

            SEGMENT.type = SegmentType.PARAM;
            STATE = parserState.IN_PARAM;

            continue;
        }

        STATE = parserState.IN_PLAIN;
        SEGMENT.value += char;
    }

    // push the last segment
    commitSegment()

    return segments;
}


export const getCollisionHash = (segments: SegmentInfo[]): string => {
    return segments
        .map(segment => {
            if (segment.type === SegmentType.PARAM) return pathIdVariableHolder
            if (segment.type === SegmentType.SPLAT) return '%%SPLAT%%'
            if (segment.type === SegmentType.DELIMITER) return undefined
            if (segment.type === SegmentType.HIDDEN) return undefined
            return segment.value
        })
        .filter(Boolean)
        .join('/')
}

export const getRouteId = (segments: SegmentInfo[]): string => {
    return segments
        // .filter((segment, index, self) => !(segment.type === SegmentType.DELIMITER && self[index - 1]?.type === SegmentType.HIDDEN)) // remove delimiters that follow hidden segments
        .map(segment => {
            if (segment.type === SegmentType.PARAM || segment.type === SegmentType.SPLAT) return '$' + segment.value
            if (segment.type === SegmentType.DELIMITER) return '/'
            return segment.value
        })
        .filter(Boolean)
        .join('')
}

export const getRoutePath = (segments: SegmentInfo[], options: RemixKissRoutesOptions): string => {
    // if first element matches options.routes, remove it
    if (options.routes.startsWith(segments[0]?.value)) segments.shift()

    // if last element is index, remove it
    if (segments[segments.length - 1]?.value === options.indexFileName) segments.pop()

    // if last element is _layout, remove it
    if (segments[segments.length - 1]?.value === options.layoutFileName) segments.pop()

    // if there's 2 delimiters in a row, or a delimiter followed by a hidden, remove it
    segments = segments.filter((segment, index, self) => {
        if (segment.type === SegmentType.DELIMITER && self[index - 1]?.type === SegmentType.DELIMITER) return false
        if (segment.type === SegmentType.DELIMITER && self[index - 1]?.type === SegmentType.HIDDEN) return false
        return true
    })

    if (segments.length === 0) return ''

    return segments.map(segment => {
        if (segment.type === SegmentType.PARAM) return ':' + segment.value
        if (segment.type === SegmentType.SPLAT) return '*'
        if (segment.type === SegmentType.DELIMITER) return '/'
        if (segment.type === SegmentType.HIDDEN) return undefined
        return segment.value
    }).filter(Boolean).join('')
}

export const adoptRoutes = (routes: InternalConfigRoute[]): InternalConfigRoute[] => {

    for (const route of routes) {
        let segments = Array.from(route.segments);
        while (!route.parentId) {
            const layoutId = getRouteId([
                ...segments,
                { value: '_layout', type: SegmentType.PLAIN } as SegmentInfo
            ])
            route.parentId = routes.find(r => (
                r.id === layoutId &&
                r.id !== route.id
            ))?.id;

            if (segments.length === 0 && !route.parentId) {
                route.parentId = 'root';
            }

            segments.pop();
        }
    }

    return routes;
}