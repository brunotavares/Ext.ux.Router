/**
 * This class can be used as a base class from which to derived Models used in Trees.
 */
Ext.define('Ext.data.TreeModel', {
    extend: 'Ext.data.Model',
    requires: [
        'Ext.data.NodeInterface'
    ]
},
function () {
    Ext.data.NodeInterface.decorate(this);
});