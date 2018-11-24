const {NodeAdapter} = require('gun-flint');
const Mongojs = require('mongojs');
const _ = require('lodash');

module.exports = new NodeAdapter({

    /**
     * @type {boolean}  Whether or not the adapter has been properly initialized and can attempt DB connections
     */
    initialized: false,

    /**
     * Handle Initialization options passed during Gun initialization of <code>opt</code> calls.
     * 
     * Prepare the adapter to create a connection to the Mongo server
     * 
     * @param {object}  context    The full Gun context during initialization/opt call
     * @param {object}  opt        Options pulled from fully context
     * 
     * @return {void}
     */
    opt: function(context, opt) {
        let mongo = opt.mongo || null;
        if (mongo) {
            this.initialized = true;
            let database = mongo.database || 'gun';
            let port = mongo.port || '27017';
            let host = mongo.host || 'localhost';
            let query = mongo.query ? '?' + mongo.query : '';
            this.collection = mongo.collection || 'gun-mongo';
            this.db = Mongojs(`mongodb://${host}:${port}/${database}${query}`);
            this.way = mongo.way || 'all';

            this.indexInBackground = mongo.indexInBackground || false;
        } else {
            this.initialized = false
        }
    },

    /**
     * Retrieve results from the DB
     * 
     * @param {string}   key    The key for the node to retrieve
     * @param {function} done   Call after retrieval (or error)
     *
     * @return {void}
     */
    get: function(key, done) {
       if (this.initialized && (this.way === 'get' || this.way === 'all') ) {
            this.getCollection().findOne({_id: key}, {}, (err, result) => {
                if (err) {
                    done(this.errors.internal)
                } else if (!result) {
                    done(this.errors.lost);
                } else {
                    //console.log("resultGET:", result["_"][">"])
                    //done(null, result["_"][">"]);
                   // console.log("resultGET:", result)
                    done(null, result);
                }
            });
        }
        done(this.errors.lost);
    },

    /**
     * Write nodes to the DB
     * 
     * @param {string}   key   The key for the node
     * @param {object}   node  The full node with metadata
     * @param {function} done  Called when the node has been written
     * 
     * @return {void}
     */
    put: function(key, node, done) {
        if (this.initialized && (this.way === 'put' || this.way === 'all')) {
            
            this.getCollection().findOne({_id: key}, {}, (err, result) => {
               // console.log("resultPUT:", result)

                if(result){
                    /*if(key === Object.getOwnPropertyNames(result["_"][">"])[0]){
                        console.log("EQUAL:", key)
                    }*/
                    //console.log("resultNICE:", result, "NODE:", node, )
                    const c = _.merge({}, result, node);
                   // console.log("juntos", c);

                    this.getCollection(key).findAndModify(
                        {
                            query: {_id: key},
                            update: c,
                            upsert: true
                        }, (err, result) => {
                           // console.log("resultPUTEND:", result)
                            done
                        }
                    );

                }else{
                    this.getCollection(key).findAndModify(
                        {
                            query: {_id: key},
                            update: node,
                            upsert: true
                        }, (err, result) => {
                            //console.log("resultPUTEND:", result)
                            done
                        }
                    );
                }

                
            })
            
        }
    },

    /**
     * Retrieve the collection for querying
     * 
     * @return {object}   A collection to query
     */
    getCollection: function() {
        return this.db.collection(this.collection);
    },

    /**
     * Ensure indexes are created on the proper fields
     * 
     * @return {void}
     */
    _ensureIndex() {
        this._getCollection().createIndex({
            _id: 1,
        }, {
            background: this.indexInBackground
        });
   }
});