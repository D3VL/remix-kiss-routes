export enum SegmentType {
    PLAIN = 'plain',
    PARAM = 'param',
    OPTIONAL = 'optional',
    OPTIONAL_PARAM = 'optional_param',
    IGNORE = 'ignore',
    DELIMITER = 'delimiter',
}

export enum RouteType {
    PAGE = 'page',
    LAYOUT = 'layout',
    INDEX = 'index',
}

export enum parserState {
    START,
    IN_PLAIN,
    IN_PARAM,
    IN_OPTIONAL,
    IN_OPTIONAL_PARAM,
    IN_IGNORE,
    END
}

export enum parserChar {
    PARAM = '$',
    SEPARATOR = '/',
    OPTIONAL_START = '(',
    OPTIONAL_END = ')',
    IGNORE_START = '[',
    IGNORE_END = ']',
    DOT = '.',
    FLATTEN = '+',
}

export type SegmentInfo = {
    value: string,
    type: SegmentType
}

export type RouteInfo = {
    fileId: string // like "dashboard.$VAR.edit" 
    filePath: string // like "/dashboard/$user_id/edit.tsx"
    urlPath: string // like "/dashboard/:user_id/edit"
    segments: SegmentInfo[] // like ["dashboard", "$user_id", "edit.tsx"]
    layout?: boolean // true if this is a layout route (i.e. "/dashboard/_layout.tsx")
    index?: boolean // true if this is an index route (i.e. "/dashboard/index.tsx")
    parent?: RouteInfo // the parent route, if any
}