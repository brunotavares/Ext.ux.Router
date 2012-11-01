/**
 * Layout class for {@link Ext.form.field.HtmlEditor} fields. Sizes the toolbar, textarea, and iframe elements.
 * @private
 */
Ext.define('Ext.layout.component.field.HtmlEditor', {
    extend: 'Ext.layout.component.field.Field',
    alias: ['layout.htmleditor'],

    type: 'htmleditor',

    // Flags to say that the item is autosizing itself.
    toolbarSizePolicy: {
        setsWidth: 0,
        setsHeight: 0
    },

    beginLayout: function(ownerContext) {
        this.callParent(arguments);

        ownerContext.textAreaContext = ownerContext.getEl('textareaEl');
        ownerContext.iframeContext   = ownerContext.getEl('iframeEl');
        ownerContext.toolbarContext  = ownerContext.context.getCmp(this.owner.getToolbar());
    },
    
    // It's not a container, can never add/remove dynamically
    renderItems: Ext.emptyFn,

    getItemSizePolicy: function (item) {
        // we are only ever called by the toolbar
        return this.toolbarSizePolicy;
    },

    getLayoutItems: function () {
        var toolbar = this.owner.getToolbar();
        // The toolbar may not exist if we're destroying
        return toolbar ? [toolbar] : [];
    },

    getRenderTarget: function() {
        return this.owner.bodyEl;
    },

    publishInnerHeight: function (ownerContext, height) {
        var me = this,
            innerHeight = height - me.measureLabelErrorHeight(ownerContext) -
                          ownerContext.toolbarContext.getProp('height') -
                          ownerContext.bodyCellContext.getPaddingInfo().height;

        // If the Toolbar has not acheieved a height yet, we are not done laying out.
        if (Ext.isNumber(innerHeight)) {
            ownerContext.textAreaContext.setHeight(innerHeight);
            ownerContext.iframeContext.setHeight(innerHeight);
        } else {
            me.done = false;
        }
    },

    measureContentHeight: function (ownerContext) {
        // We cannot measure the contentHeight until the toolbar height is correct in the
        // dom. In order for the toolbar hight to be correct in the dom, the toolbar's
        // innerCt must have its width set in the dom, otherwise the box overflow trigger
        // may be wrapping, causing extra height to be added to the toolbar.
        return ownerContext.hasDomProp('componentChildrenDone') ?
            this.callParent(arguments) : NaN;
    }
 
});