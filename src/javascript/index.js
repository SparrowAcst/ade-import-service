
const fs = require("fs")
const YAML = require('js-yaml')
const bodyParser = require('body-parser')
const express = require('express')
const CORS = require("cors")
const busboy = require('connect-busboy')
const morgan = require("morgan")
const swaggerUi = require('swagger-ui-express')
const swStats = require('swagger-stats')

const swaggerDocument = YAML.load(fs.readFileSync('./oas.yml').toString())

const config  = require("../../.config/service-config")


const app = express();

app.use(CORS())

app.use(morgan('dev'))

app.use(bodyParser.text());

app.use(bodyParser.json({
    limit: '50mb'
}))

app.use(bodyParser.urlencoded({
        parameterLimit: 100000,
        limit: '50mb',
        extended: true
    }));

app.use(busboy())

// app.use( (req, res, next) => {
//   console.log("-----  ", (req.user) ? `${req.user.name} (${req.user.email})` : "anonymous",  " > ", req.path,"  -----")
//   next()
// })

// swaggerDocument.servers[0].url = process.env.HOST || config.service.host;
// swaggerDocument.servers[0].description = "";

app.use(swStats.getMiddleware({swaggerSpec:swaggerDocument, uriPath:"/metrics", name:"ADE IMPORT SERVICE"}))
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

let routes = require("./routes")(config)

routes.forEach( route => {
	console.log(route)
	app[route.method](route.path, route.handler)
})


app.get("/", (req, res) => {
    res.json({service: "ADE IMPORT SERVICE"})
})



module.exports = {
    app,
    config
}    