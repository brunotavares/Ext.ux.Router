/**
 * Produces optimized XTemplates for chunks of tables to be
 * used in grids, trees and other table based widgets.
 */
Ext.define('Ext.view.TableChunker', {
    singleton: true,
    requires: ['Ext.XTemplate'],
    metaTableTpl: [
        '{%if (this.openTableWrap)out.push(this.openTableWrap())%}',
        '<table class="' + Ext.baseCSSPrefix + 'grid-table ' + Ext.baseCSSPrefix + 'grid-table-resizer" border="0" cellspacing="0" cellpadding="0" {[this.embedFullWidth(values)]}>',
            '<tbody>',
            '<tr class="' + Ext.baseCSSPrefix + 'grid-header-row">',
            '<tpl for="columns">',
                '<th class="' + Ext.baseCSSPrefix + 'grid-col-resizer-{id}" style="width: {width}px; height: 0px;"></th>',
            '</tpl>',
            '</tr>',
            '{[this.openRows()]}',
                '{row}',
                '<tpl for="features">',
                    '{[this.embedFeature(values, parent, xindex, xcount)]}',
                '</tpl>',
            '{[this.closeRows()]}',
            '</tbody>',
        '</table>',
        '{%if (this.closeTableWrap)out.push(this.closeTableWrap())%}'
    ],

    constructor: function() {
        Ext.XTemplate.prototype.recurse = function(values, reference) {
            return this.apply(reference ? values[reference] : values);
        };
    },

    embedFeature: function(values, parent, x, xcount) {
        if (!values.disabled) {
            return values.getFeatureTpl(values, parent, x, xcount);
        }
        return '';
    },

    embedFullWidth: function(values) {
        var result = 'style="width:{fullWidth}px;';

        // If there are no records, we need to give the table a height so that it
        // is displayed and causes q scrollbar if the width exceeds the View's width.
        if (!values.rowCount) {
            result += 'height:1px;';
        }
        return result + '"';
    },

    openRows: function() {
        return '<tpl for="rows">';
    },

    closeRows: function() {
        return '</tpl>';
    },

    metaRowTpl: [
        '<tr class="' + Ext.baseCSSPrefix + 'grid-row {[this.embedRowCls()]}" {[this.embedRowAttr()]}>',
            '<tpl for="columns">',
                '<td class="{cls} ' + Ext.baseCSSPrefix + 'grid-cell ' + Ext.baseCSSPrefix + 'grid-cell-{columnId} {{id}-modified} {{id}-tdCls} {[this.firstOrLastCls(xindex, xcount)]}" {{id}-tdAttr}>',
                    '<div {unselectableAttr} class="' + Ext.baseCSSPrefix + 'grid-cell-inner {unselectableCls}" style="text-align: {align}; {{id}-style};">{{id}}</div>',
                '</td>',
            '</tpl>',
        '</tr>'
    ],
    
    firstOrLastCls: function(xindex, xcount) {
        var result = '';
        
        if (xindex === 1) {
            result = Ext.view.Table.prototype.firstCls;
        }
        
        if (xindex === xcount) {
            result += ' ' + Ext.view.Table.prototype.lastCls;
        }
        return result;
    },
    
    embedRowCls: function() {
        return '{rowCls}';
    },
    
    embedRowAttr: function() {
        return '{rowAttr}';
    },
    
    openTableWrap: undefined,
    
    closeTableWrap: undefined,

    getTableTpl: function(cfg, textOnly) {
        var me = this,
            tpl,
            tableTplMemberFns = {
                openRows: me.openRows,
                closeRows: me.closeRows,
                embedFeature: me.embedFeature,
                embedFullWidth: me.embedFullWidth,
                openTableWrap: me.openTableWrap,
                closeTableWrap: me.closeTableWrap
            },
            tplMemberFns = {},
            features = cfg.features,
            featureCount = features ? features.length : 0,
            i  = 0,
            memberFns = {
                embedRowCls: me.embedRowCls,
                embedRowAttr: me.embedRowAttr,
                firstOrLastCls: me.firstOrLastCls,
                unselectableAttr: cfg.enableTextSelection ? '' : 'unselectable="on"',
                unselectableCls: cfg.enableTextSelection ? '' : Ext.baseCSSPrefix + 'unselectable'
            },
            // copy the template spec array if there are Features which might mutate it 
            metaRowTpl = featureCount ? Array.prototype.slice.call(me.metaRowTpl, 0) : me.metaRowTpl;

        for (; i < featureCount; i++) {
            if (!features[i].disabled) {
                features[i].mutateMetaRowTpl(metaRowTpl);
                Ext.apply(memberFns, features[i].getMetaRowTplFragments());
                Ext.apply(tplMemberFns, features[i].getFragmentTpl());
                Ext.apply(tableTplMemberFns, features[i].getTableFragments());
            }
        }

        cfg.row = new Ext.XTemplate(metaRowTpl.join(''), memberFns).applyTemplate(cfg);

        tpl = new Ext.XTemplate(me.metaTableTpl.join(''), tableTplMemberFns).applyTemplate(cfg);
        
        // TODO: Investigate eliminating.
        if (!textOnly) {
            tpl = new Ext.XTemplate(tpl, tplMemberFns);
        }
        return tpl;
    }
});
