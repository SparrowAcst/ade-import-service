const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

let $config
let app

const getBucket = () => {
  
  if(!$config) throw new Error(`Service not configured.`)
  if(!$config.firebase) throw new Error(`Fire Storage not configured.`)

  if(!app){
    app = initializeApp({
      credential: cert($config.firebase.account),
      storageBucket: `gs://${$config.firebase.account.project_id}.appspot.com`
    })  
  }  
  

  const bucket = getStorage(app).bucket();

  return bucket  

}


const saveBucketFile = async (sourceFilepath, destFilename) => {
  
  try {

    const bucket = getBucket()
    
    let res = await bucket.upload(sourceFilepath, {
      gzip: true,
      destination: destFilename,
      metadata: {
        contentType: 'audio/x-wav'
      }
    })

    res = await res[0].getSignedUrl({
      action: 'read',
      expires: new Date().setFullYear(new Date().getFullYear() + 2)
    })

    return res

  } catch(e) {
    console.log(`saveBucketFile: ${e.toString()}.`) // Retry save '${sourceFilepath}' > '${destFilename}'`);
    throw e  
    // return //saveBucketFile(sourceFilepath, destFilename);
  }

}

const saveBucketFileFromStream = (filename, mimeType, stream) => new Promise( (resolve,reject) => {
    
  const bucket = getBucket()

  stream

    .pipe(bucket.file(filename).createWriteStream({
      gzip: true,
      metadata: {
        contentType: fmimeType
      }
    }))
    
    .on('finish', async () => {
      
      let res = await bucket.file(filename).getSignedUrl({
        action: 'read',
        expires: new Date().setFullYear(new Date().getFullYear() + 2)
      })
      
      resolve(res)
    })  
    
    .on('error', err => {
      reject(err)
    })
  
})
  



const readBucketFile = async (srcFilename, destFilename) => {

  try {

    const bucket = getBucket()

    const options = {
      destination: destFilename,
    };

    return bucket.file(srcFilename).download(options)
  
  } catch(e) {
  
    console.log(`readBucketFile: ${e.toString}`)
    throw (e)
  
  }  

}


const getBucketFileMetadata = async filename => {
  let res = []
  try {
    res = await bucket.file(filename).getMetadata()
  } catch (e){
    console.log(e.toString())
  } finally {
    return res[0]  
  }
  
}





module.exports = config => {

  $config = config

  return {
    saveBucketFile,
    saveBucketFileFromStream,
    readBucketFile,
    getBucketFileMetadata
  }

} 


