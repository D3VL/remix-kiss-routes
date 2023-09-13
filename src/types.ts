import { ConfigRoute } from "@remix-run/dev/dist/config/routes"

export enum SegmentType {
    PLAIN = 'plain',
    PARAM = 'param',
    IGNORE = 'ignore',
    DELIMITER = 'delimiter',
    HIDDEN = 'hidden',
    SPLAT = 'splat',
}

export enum parserState {
    START,
    IN_PLAIN,
    IN_PARAM,
    IN_IGNORE,
    END
}

export enum parserChar {
    PARAM = '$',
    SEPARATOR = '/',
    IGNORE_START = '[',
    IGNORE_END = ']',
    DOT = '.',
    FLATTEN = '+',
}

export type SegmentInfo = {
    value: string,
    type: SegmentType
}


export type RemixKissRoutesOptions = {
    app: string
    routes: string
    caseSensitive?: boolean
    variableCharacter?: string
    flattenCharacter?: string
    delimiterCharacter?: string
    layoutFileName?: string
    indexFileName?: string
}

export type InternalConfigRoute = {
    isLayout: boolean
    collisionHash: string
    segments: SegmentInfo[]
} & ConfigRoute
