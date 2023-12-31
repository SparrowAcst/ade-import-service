const mongo = require('mongodb').MongoClient

let $config

const getClient = async () => {

	let client = await mongo.connect($config.mongodb.db.url, {
	    useNewUrlParser: true,
	    useUnifiedTopology: true
	})	

	return client
}

const normalize = str => {
	str = str.split(".")
	return {
		dbName: str[0],
		collectionName: str[1]
	}
}	

const aggregate = async (collectionName, pipeline) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
    pipeline = pipeline || []
    let res = await collection.aggregate(pipeline.concat([{$project:{_id:0}}])).toArray()
    
    client.close()
    
    return res
}

const getAggregateCursor =  async (collectionName, pipeline) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
    pipeline = pipeline || []
    let res = collection.aggregate(pipeline.concat([{$project:{_id:0}}]))
    
    client.close()
    
    return res
}

const removeAll = async (collectionName) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
    await collection.deleteMany({})

    client.close()
    
} 

const insertAll = async (collectionName, data) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)

	await collection.insertMany(data)

    client.close()
    
}

const bulkWrite = async (collectionName, commands) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
	await collection.bulkWrite(commands)

    client.close()
    
}

const replaceOne = async (collectionName, filter, data) => {
	
	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
    await collection.replaceOne(filter, data, {upsert: true})

    client.close()
    
}

const updateOne = async (collectionName, filter, data) => {

	let client = await getClient()

	let conf = normalize(collectionName)
	let db = client.db(conf.dbName)
    let collection = db.collection(conf.collectionName)
    await collection.updateOne(filter, { $set:data }, { upsert: true })

    client.close()
    
}

const listCollections = async dbSchema => {

	let client = await getClient()

		
	let conf = normalize(dbSchema)
	const res =  await client
					.db(conf.dbName)
    				.listCollections()
    				.toArray()

    client.close()
    
	return res
	
}



module.exports =  config => {

	$config = config
	
	return {
		aggregate,
		removeAll,
		insertAll,
		replaceOne,
		updateOne,
		bulkWrite,
		listCollections,
		getAggregateCursor	
	}

}