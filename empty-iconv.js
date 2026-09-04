// Empty stub for iconv-lite.
//
// iconv-lite is pulled in transitively by body-parser for charset detection,
// which our JSON-only API never uses. Its Node stream code doesn't bundle on
// Workers, so we alias it to this empty module during the Workers build.
export default {};
