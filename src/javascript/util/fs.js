const fs = require("fs")
const fse = require("fs-extra")
const path = require("path")

const makeDir = async dir => await fse.mkdirs(path.resolve(dir))

module.exports = {
	makeDir,
    pathExists: fse.pathExistsSync
}

