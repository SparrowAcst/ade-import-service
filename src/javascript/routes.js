const { extend, isUndefined }  = require("lodash")
const FbStorageService = require("./util/fb")
const MongodbService = require("./util/mongodb")
const fs = require("fs")
const { makeDir, pathExists} = require("./util/fs")
const path = require("path")
const uuid = require("uuid").v4

const labelingRules = require("../../.config/stethophone-app-metadata.json")
                        .filter(d => !isUndefined(d.import))
                        .map(d => ({
                            key: d.name,
                            import: eval(d.import)
                        }))


let $config
let mongodb
let fb

const getActor = async () => {
    
    try {

        let res = await mongodb.aggregate(
            $config.mongodb.collection.actor,
            [ { $match:{} } ]
        )

        return res[0]
    
    } catch(e) {
    
        throw e
    
    }    

}

const createForms = async examination => {
    try { 
    
        let forms = [
            {
                id: uuid(),
                type: "patient",
                submittedBy: examination.actorId,
                examinationId: examination.id,
                patientId: examination.id,
                data:{
                    en: examination.patient || {},
                    uk: examination.patient || {},
                }
            },
            {
                id: uuid(),
                type: "ekg",
                submittedBy: examination.actorId,
                examinationId: examination.id,
                patientId: examination.id,
                data:{
                    en: {},
                    uk: {}
                }
            },
            {
                id: uuid(),
                type: "echo",
                submittedBy: examination.actorId,
                examinationId: examination.id,
                patientId: examination.id,
                data:{
                    en: {},
                    uk: {}
                }
            },
            {
                id: uuid(),
                type: "attachements",
                submittedBy: examination.actorId,
                examinationId: examination.id,
                patientId: examination.id,
                data:[]
            }
        ]

        await mongodb.insertAll(
            $config.mongodb.collection.form,
            forms
        )
    } catch(e) {
    
        throw e
    
    }    

}

const createExamination = async examination => {
    
    try {
        
        const actor = await getActor()
        
        examination = extend( {}, examination, {
            "comment": "",
            "state": "accepted",
            "type": null,
            "patientId": examination.id,
            "actorId": actor.id
        })
        
        const forms = await createForms(examination)
        
        delete examination.patient
        
        await mongodb.replaceOne(
            $config.mongodb.collection.examination,
            { id : examination.id },
            examination
        )
    
    } catch (e) {
    
        throw e
    
    }    

}


const createAsset = async query => {
    
    let sourceFilepath

    try {
        
        query.device = query.device || "iOS"
        query.file.path = `${$config.firebase.homeDir}/${query.examinationId}/${query.file.filename}`
        query.file.url = `http://ec2-54-235-192-121.compute-1.amazonaws.com:8002/?record_v3=${query.file.path}&patientId=${query.examinationId}&position=${query.position}&spot=${query.spot}&device=${query.device}`
        
        const uploadDir = path.join(__dirname, $config.service.uploadDir)
        sourceFilepath = path.join(`${uploadDir}/${query.file.filename}`)
        
        await fb.saveBucketFile(
            sourceFilepath, 
            query.file.path
        )

 
        return query
    
    } catch (e) {
    
        throw e
    
    } finally {

        if(sourceFilepath) await fs.promises.unlink(sourceFilepath)
       
    }   
                
}


const createLabels = async query => {

    try {

        query.form = {}
        query.form.patient = await mongodb.aggregate(
            $config.mongodb.collection.form,
            [
                {
                    $match: {
                        type: "patient",
                        examinationId: query.examinationId
                    }
                }
            ]
        )

        query.form.patient = query.form.patient || {}
        
        let res = {}
        labelingRules.forEach( r => {
            res[r.key] = r.import(query) 
        })

        await mongodb.replaceOne(
            $config.mongodb.collection.labeling,
            { id : res.id },
            res
        )

     } catch(e) {

        throw e

     }   

}



const postNewExamination = async (req, res) => {

    try {
    
        const options = req.body
        
        if(!options.dateTime) {
            res.status(422).send({
                operation: "createExamination",
                error: "Invalid input",
                reason: "dateTime required",
                request:{
                    path: "/examination",
                    method: "POST",
                    body: options
                }
            })
            return
        }
        
        let examination = extend( {}, options, { id: uuid() } )
        await createExamination(examination)
        
        res.status(200).send({id: examination.id})
    
    } catch (e) {

        res.status(500).send({
            operation: "createExamination",
            error: "Service Error",
            reason: e.toString(),
            request:{
                path: "/examination",
                method: "POST",
                body: req.body
            }
        })

    }    

}

const postUploadRecording = async (req, res) => {

    let query

    try {

         query = req.query;

        if (req.busboy) {
          
            await ( new Promise( (resolve, reject) => {
           

              req.busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated) => {
                if(fieldname) query[fieldname] = val;
              })

              req.busboy.on('file', async (name, file, info) => {

                console.log("\n----- upload -----", info)
                query.file = info

                const uploadDir = path.join(__dirname, $config.service.uploadDir)
                
                if(!pathExists(uploadDir)){
                    await makeDir(uploadDir)
                }
                
                const destFilePath = path.join(`${uploadDir}/${info.filename}`)
                
                let stream = await fs.createWriteStream(destFilePath, {flags:'w'})

                stream.on('close', async file => {
                  
                    resolve(file);
                
                })
                
                stream.on('error', e => {
                  
                  console.log(`upload error: ${e.toString()}`)
                  return
                
                })
                
                file.pipe(stream);

              })
             
              req.pipe(req.busboy)

            }))  
        }


        let rules = [

            options => (options.examinationId) ? true : 'examinationId required',
            options => (options.spot) ? true : 'spot required',
            options => (options.position) ? true : 'position required',
            options => (options.file) ? true : 'file required'
            
        ]

        let valid = rules.map( rule => rule(query)).reduce( (a,v) => a && v === true, true)

        if(!valid) {
            
            res.status(422).send({
                operation: "uploadRecording",
                error: "Invalid input",
                reason: rules.map( rule => rule(query)).filter( v => v != true).join(", ")+".",
                request:{
                    path: "/recording",
                    method: "POST",
                    query
                }
            })
            
            return

        }

        let examinations = await mongodb.aggregate(
            $config.mongodb.collection.examination,
            [ { $match:{ id: query.examinationId } } ]
        )

        if(examinations.length == 0){
            
            res.status(422).send({
                operation: "uploadRecording",
                error: "Invalid input",
                reason: `Examination ${query.examinationId} not found.`,
                request:{
                    path: "/recording",
                    method: "POST",
                    query
                }
            })
            
            return

        }

        let labels = await mongodb.aggregate(
            $config.mongodb.collection.labeling,
            [
                {
                    $match: {
                        "Body Position": query.position,
                        "Body Spot": query.spot,
                        "Examination ID": query.examinationId
                    }
                }
            ]
        )


        if(labels.length > 0){
  
            query.id = labels[0].id            
  
            // res.status(422).send({
            //     operation: "uploadRecording",
            //     error: "Invalid input",
            //     reason: `Recording ${query.spot} ${query.position} for examination ${query.examinationId} already exists.`,
            //     request:{
            //         path: "/recording",
            //         method: "POST",
            //         query
            //     }
            // })
            
            // return

        } else {
            query.id = uuid()
        }

        
        query = await createAsset(query)

        await createLabels(query) 

        delete query.form

        res.status(200).send(query)

    } catch (e) {

            res.status(500).send({
                operation: "uploadRecording",
                error: "Service Error",
                reason: e.toString(),
                request:{
                    path: "/recording",
                    method: "POST",
                    query
                }
            })
        

    }    


}


module.exports = config => {
    
    $config = config
    mongodb = MongodbService($config)
    fb = FbStorageService($config)

    return [
    
        {
            method: "post",
            path: "/examination",
            handler: postNewExamination
        },

        {
            method: "post",
            path: "/recording",
            handler: postUploadRecording
        }


    ] 

}


