const nunjucks = require('nunjucks');
const package = require('./package.json');
nunjucks.configure({ autoescape: false });
console.log(nunjucks.render('./meta/metadata.njk', package));
