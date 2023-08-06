const YAML        = require("js-yaml")
const { extend }  = require("lodash")

let $config = {}



module.exports = config => {
    $config = config 

    return [
    
        // {
        //     method: "get",
        //     path: "/state",
        //     handler: sendResponse
        // },
        
        // {
        //     method: "post",
        //     path: "/node/register",
        //     handler: registerWebservice
        // }

    ] 

}


