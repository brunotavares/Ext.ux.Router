/**
 * @class Ext.data.writer.Json

This class is used to write {@link Ext.data.Model} data to the server in a JSON format.
The {@link #allowSingle} configuration can be set to false to force the records to always be
encoded in an array, even if there is only a single record being sent.

 * @markdown
 */
Ext.define('Ext.data.writer.Json', {
    extend: 'Ext.data.writer.Writer',
    alternateClassName: 'Ext.data.JsonWriter',
    alias: 'writer.json',
    
    /**
     * @cfg {String} root The HTTP parameter name by which JSON encoded records will be passed to the server if the
     * {@link #encode} option is `true`.
     */
    root: undefined,
    
    /**
     * @cfg {Boolean} [encode=false] Configure `true` to send record data (all record fields if {@link #writeAllFields} is `true`)
     * as a JSON encoded HTTP parameter named by the {@link #root} configuration.
     * 
     * The encode option should only be set to true when a {@link #root} is defined, because the values will be
     * sent as part of the request parameters as opposed to a raw post. The root will be the name of the parameter
     * sent to the server.
     */
    encode: false,
    
    /**
     * @cfg {Boolean} [allowSingle=true] Configure with `false` to ensure that records are always wrapped in an array, even if there is only
     * one record being sent. When there is more than one record, they will always be encoded into an array.
     */
    allowSingle: true,
    
    //inherit docs
    writeRecords: function(request, data) {
        var root = this.root;
        
        if (this.allowSingle && data.length == 1) {
            // convert to single object format
            data = data[0];
        }
        
        if (this.encode) {
            if (root) {
                // sending as a param, need to encode
                request.params[root] = Ext.encode(data);
            } else {
                //<debug>
                Ext.Error.raise('Must specify a root when using encode');
                //</debug>
            }
        } else {
            // send as jsonData
            request.jsonData = request.jsonData || {};
            if (root) {
                request.jsonData[root] = data;
            } else {
                request.jsonData = data;
            }
        }
        return request;
    }
});
