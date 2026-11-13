const { MongoClient } = require("mongodb");

let clientPromise;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI não configurada.");
  if (!globalThis.__ostentyMongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
    globalThis.__ostentyMongoClientPromise = client.connect();
  }
  clientPromise = globalThis.__ostentyMongoClientPromise;
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "ostenty");
}

async function getProductsCollection() {
  const db = await getDb();
  const collection = db.collection("products");
  await collection.createIndex({ code: 1 }, { unique: true, name: "unique_product_code" });
  await collection.createIndex({ status: 1, category: 1 }, { name: "catalog_filters" });
  return collection;
}

module.exports = { getDb, getProductsCollection };
