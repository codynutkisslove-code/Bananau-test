self.__uv$config = {
    prefix: '/go/', 
    bare: '/api/v1/',
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/core/handler.js',
    bundle: '/core/bundle.js',
    config: '/core/sys.config.js',
    sw: '/core/sw.js',
};
