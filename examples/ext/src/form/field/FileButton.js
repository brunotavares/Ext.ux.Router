/**
 *
 */
Ext.define('Ext.form.field.FileButton', {
    extend: 'Ext.button.Button',
    alias: 'widget.filebutton',
    
    childEls: [
        'btnEl', 'btnWrap', 'btnInnerEl', 'btnIconEl', 'fileInputEl'
    ],
    
    inputCls: Ext.baseCSSPrefix + 'form-file-input',
    
    cls: Ext.baseCSSPrefix + 'form-file-btn',
    
    preventDefault: false,

    renderTpl: [
        '<em id="{id}-btnWrap"<tpl if="splitCls"> class="{splitCls}"</tpl>>',
            '<button id="{id}-btnEl" type="{type}" class="{btnCls}" hidefocus="true"',
                // the autocomplete="off" is required to prevent Firefox from remembering
                // the button's disabled state between page reloads.
                '<tpl if="tabIndex"> tabIndex="{tabIndex}"</tpl>',
                '<tpl if="disabled"> disabled="disabled"</tpl>',
                ' role="button" autocomplete="off">',
                '<span id="{id}-btnInnerEl" class="{baseCls}-inner" style="{innerSpanStyle}">',
                    '{text}',
                '</span>',
                '<span id="{id}-btnIconEl" class="{baseCls}-icon {iconCls}"<tpl if="iconUrl"> style="background-image:url({iconUrl})"</tpl>></span>',
            '</button>',
        '</em>',
        '<input id="{id}-fileInputEl" class="{inputCls}" type="file" size="1" name="{inputName}">'
    ],
    
    getTemplateArgs: function(){
        var args = this.callParent();
        args.inputCls = this.inputCls;
        args.inputName = this.inputName;
        return args;
    },
    
    afterRender: function(){
        var me = this;
        me.callParent(arguments);
        me.fileInputEl.on('change', me.fireChange, me);    
    },
    
    fireChange: function(e){
        this.fireEvent('change', this, e, this.fileInputEl.dom.value);
    },
    
    /**
     * @private
     * Creates the file input element. It is inserted into the trigger button component, made
     * invisible, and floated on top of the button's other content so that it will receive the
     * button's clicks.
     */
    createFileInput : function() {
        var me = this;
        me.fileInputEl = me.el.createChild({
            name: me.inputName,
            id: me.id + '-fileInputEl',
            cls: me.inputCls,
            tag: 'input',
            type: 'file',
            size: 1
        });
        me.fileInputEl.on('change', me.fireChange, me);  
    },
    
    reset: function(){
        this.fileInputEl.remove();
        this.createFileInput();
    },
    
    onDisable: function(){
        this.callParent();
        this.fileInputEl.dom.disabled = true;
    },

    onEnable : function() {
        this.callParent();
        this.fileInputEl.dom.disabled = false;
    }
});
