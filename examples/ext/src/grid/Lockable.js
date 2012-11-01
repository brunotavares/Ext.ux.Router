/**
 * @private
 *
 * Lockable is a private mixin which injects lockable behavior into any
 * TablePanel subclass such as GridPanel or TreePanel. TablePanel will
 * automatically inject the Ext.grid.Lockable mixin in when one of the
 * these conditions are met:
 *
 *  - The TablePanel has the lockable configuration set to true
 *  - One of the columns in the TablePanel has locked set to true/false
 *
 * Each TablePanel subclass must register an alias. It should have an array
 * of configurations to copy to the 2 separate tablepanel's that will be generated
 * to note what configurations should be copied. These are named normalCfgCopy and
 * lockedCfgCopy respectively.
 *
 * Columns which are locked must specify a fixed width. They do NOT support a
 * flex width.
 *
 * Configurations which are specified in this class will be available on any grid or
 * tree which is using the lockable functionality.
 */
Ext.define('Ext.grid.Lockable', {

    requires: [
        'Ext.grid.LockingView',
        'Ext.view.Table'
    ],

    /**
     * @cfg {Boolean} syncRowHeight Synchronize rowHeight between the normal and
     * locked grid view. This is turned on by default. If your grid is guaranteed
     * to have rows of all the same height, you should set this to false to
     * optimize performance.
     */
    syncRowHeight: true,

    /**
     * @cfg {String} subGridXType The xtype of the subgrid to specify. If this is
     * not specified lockable will determine the subgrid xtype to create by the
     * following rule. Use the superclasses xtype if the superclass is NOT
     * tablepanel, otherwise use the xtype itself.
     */

    /**
     * @cfg {Object} lockedViewConfig A view configuration to be applied to the
     * locked side of the grid. Any conflicting configurations between lockedViewConfig
     * and viewConfig will be overwritten by the lockedViewConfig.
     */

    /**
     * @cfg {Object} normalViewConfig A view configuration to be applied to the
     * normal/unlocked side of the grid. Any conflicting configurations between normalViewConfig
     * and viewConfig will be overwritten by the normalViewConfig.
     */

    headerCounter: 0,

    /**
     * @cfg {Number} scrollDelta
     * Number of pixels to scroll when scrolling the locked section with mousewheel.
     */
    scrollDelta: 40,
    
    /**
     * @cfg {Object} lockedGridConfig
     * Any special configuration options for the locked part of the grid
     */
    
    /**
     * @cfg {Object} normalGridConfig
     * Any special configuration options for the normal part of the grid
     */
    
    lockedGridCls: Ext.baseCSSPrefix + 'grid-inner-locked',

    // i8n text
    //<locale>
    unlockText: 'Unlock',
    //</locale>
    //<locale>
    lockText: 'Lock',
    //</locale>

    determineXTypeToCreate: function() {
        var me = this,
            typeToCreate,
            xtypes, xtypesLn, xtype, superxtype;

        if (me.subGridXType) {
            typeToCreate = me.subGridXType;
        } else {
            xtypes     = this.getXTypes().split('/');
            xtypesLn   = xtypes.length;
            xtype      = xtypes[xtypesLn - 1];
            superxtype = xtypes[xtypesLn - 2];

            if (superxtype !== 'tablepanel') {
                typeToCreate = superxtype;
            } else {
                typeToCreate = xtype;
            }
        }

        return typeToCreate;
    },

    // injectLockable will be invoked before initComponent's parent class implementation
    // is called, so throughout this method this. are configurations
    injectLockable: function() {
        // ensure lockable is set to true in the TablePanel
        this.lockable = true;
        // Instruct the TablePanel it already has a view and not to create one.
        // We are going to aggregate 2 copies of whatever TablePanel we are using
        this.hasView = true;

        var me = this,
            scrollbarHeight = Ext.getScrollbarSize().width,
            store = me.store = Ext.StoreManager.lookup(me.store),
            // xtype of this class, 'treepanel' or 'gridpanel'
            // (Note: this makes it a requirement that any subclass that wants to use lockable functionality needs to register an
            // alias.)
            xtype = me.determineXTypeToCreate(),
            // share the selection model
            selModel = me.getSelectionModel(),

            // Hash of {lockedFeatures:[],normalFeatures:[]}
            allFeatures,

            // Hash of {topPlugins:[],lockedPlugins:[],normalPlugins:[]}
            allPlugins,

            lockedGrid,
            normalGrid,
            i,
            columns,
            lockedHeaderCt,
            normalHeaderCt,
            lockedView,
            normalView,
            listeners;

        allFeatures = me.constructLockableFeatures();

        // This is just a "shell" Panel which acts as a Container for the two grids and must not use the features
        delete me.features;

        // Distribute plugins to whichever Component needs them
        allPlugins = me.constructLockablePlugins();
        me.plugins = allPlugins.topPlugins;

        lockedGrid = Ext.apply({
            ownerLockable: me,
            xtype: xtype,
            store: store,
            scrollerOwner: false,
            // Lockable does NOT support animations for Tree
            enableAnimations: false,
            // If the OS does not show a space-taking scrollbar, the locked view can be overflow-y:auto
            scroll: scrollbarHeight ? false : 'vertical',
            selModel: selModel,
            border: false,
            cls: me.lockedGridCls,
            isLayoutRoot: function() {
                return false;
            },
            features: allFeatures.lockedFeatures,
            plugins: allPlugins.lockedPlugins
        }, me.lockedGridConfig);

        normalGrid = Ext.apply({
            ownerLockable: me,
            xtype: xtype,
            store: store,
            scrollerOwner: false,
            enableAnimations: false,
            selModel: selModel,
            border: false,
            isLayoutRoot: function() {
                return false;
            },
            features: allFeatures.normalFeatures,
            plugins: allPlugins.normalPlugins
        }, me.normalGridConfig);

        me.addCls(Ext.baseCSSPrefix + 'grid-locked');

        // copy appropriate configurations to the respective
        // aggregated tablepanel instances and then delete them
        // from the master tablepanel.
        Ext.copyTo(normalGrid, me, me.bothCfgCopy);
        Ext.copyTo(lockedGrid, me, me.bothCfgCopy);
        Ext.copyTo(normalGrid, me, me.normalCfgCopy);
        Ext.copyTo(lockedGrid, me, me.lockedCfgCopy);
        for (i = 0; i < me.normalCfgCopy.length; i++) {
            delete me[me.normalCfgCopy[i]];
        }
        for (i = 0; i < me.lockedCfgCopy.length; i++) {
            delete me[me.lockedCfgCopy[i]];
        }

        me.addEvents(
            /**
             * @event processcolumns
             * Fires when the configured (or **reconfigured**) column set is split into two depending on the {@link Ext.grid.column.Column#locked locked} flag.
             * @param {Ext.grid.column.Column[]} lockedColumns The locked columns.
             * @param {Ext.grid.column.Column[]} normalColumns The normal columns.
             */
            'processcolumns',

            /**
             * @event lockcolumn
             * Fires when a column is locked.
             * @param {Ext.grid.Panel} this The gridpanel.
             * @param {Ext.grid.column.Column} column The column being locked.
             */
            'lockcolumn',

            /**
             * @event unlockcolumn
             * Fires when a column is unlocked.
             * @param {Ext.grid.Panel} this The gridpanel.
             * @param {Ext.grid.column.Column} column The column being unlocked.
             */
            'unlockcolumn'
        );

        me.addStateEvents(['lockcolumn', 'unlockcolumn']);

        me.lockedHeights = [];
        me.normalHeights = [];

        columns = me.processColumns(me.columns);

        // Locked grid has a right border. Locked grid must shrinkwrap columns with no horiontal scroll, so
        // we must increment by the border width: 1px. TODO: get Grid working shrinkwrapping total column width.
        lockedGrid.width = columns.lockedWidth + Ext.num(selModel.headerWidth, 0) + (columns.locked.length ? 1 : 0);
        lockedGrid.columns = columns.locked;
        normalGrid.columns = columns.normal;

        // normal grid should flex the rest of the width
        normalGrid.flex = 1;
        lockedGrid.viewConfig = me.lockedViewConfig || {};
        lockedGrid.viewConfig.loadingUseMsg = false;

        // Padding below locked grid body only if there are scrollbars on this system
        // This takes the place of any spacer element.
        // Important: The height has to be postprocessed after render to override
        // the inline border styles injected by automatic component border settings.
        if (scrollbarHeight) {
            lockedGrid.viewConfig.style = 'border-bottom:' + scrollbarHeight +
                'px solid #f6f6f6;' + (lockedGrid.viewConfig.style || '');
        }

        normalGrid.viewConfig = me.normalViewConfig || {};

        //<debug>
        if (me.viewConfig && me.viewConfig.id) {
            Ext.log.warn('id specified on viewConfig, it will be shared between both views: "' + me.viewConfig.id + '"');
        }
        //</debug>

        Ext.applyIf(lockedGrid.viewConfig, me.viewConfig);
        Ext.applyIf(normalGrid.viewConfig, me.viewConfig);

        me.lockedGrid = Ext.ComponentManager.create(lockedGrid);

        // Keep locked section's bottom border width synched
        if (scrollbarHeight) {
            me.lockedGrid.on({
                afterlayout: me.afterLockedViewLayout,
                scope: me
            });
        }
        lockedView = me.lockedGrid.getView();
        
        normalGrid.viewConfig.lockingPartner = lockedView;
        me.normalGrid = Ext.ComponentManager.create(normalGrid);
        normalView = me.normalGrid.getView();
        
        me.view = Ext.create(me.getLockingViewConfig());

        // Set up listeners for the locked view. If its SelModel ever scrolls it, the normal view must sync
        listeners = {
            scroll: {
                fn: me.onLockedViewScroll,
                element: 'el',
                scope: me
            }
        };
        // If there are system scrollbars, we have to monitor the mousewheel and fake a scroll
        // Also we need to postprocess the border width because of inline border setting styles.
        // The locked grid needs a bottom border to match with any scrollbar present in the normal grid 
        if (scrollbarHeight) {
            listeners.mousewheel = {
                fn: me.onLockedViewMouseWheel,
                element: 'el',
                scope: me
            };
        }
        if (me.syncRowHeight) {
            listeners.refresh = me.onLockedViewRefresh;
            listeners.itemupdate = me.onLockedViewItemUpdate;
            listeners.scope = me;
        }
        lockedView.on(listeners);

        // Set up listeners for the normal view
        listeners = {
            scroll: {
                fn: me.onNormalViewScroll,
                element: 'el',
                scope: me
            },
            scope: me
        };
        if (me.syncRowHeight) {
            listeners.refresh = me.onNormalViewRefresh;
        }
        normalView.on(listeners);

        lockedHeaderCt = me.lockedGrid.headerCt;
        normalHeaderCt = me.normalGrid.headerCt;

        lockedHeaderCt.lockedCt = true;
        lockedHeaderCt.lockableInjected = true;
        normalHeaderCt.lockableInjected = true;

        lockedHeaderCt.on({
            // buffer to wait until multiple adds have fired
            add: {
                buffer: 1,
                scope: me,
                fn: me.onLockedHeaderAdd
            },
            columnshow: me.onLockedHeaderShow,
            columnhide: me.onLockedHeaderHide,
            columnmove: me.onLockedHeaderMove,
            sortchange: me.onLockedHeaderSortChange,
            columnresize: me.onLockedHeaderResize,
            scope: me
        });

        normalHeaderCt.on({
            columnmove: me.onNormalHeaderMove,
            sortchange: me.onNormalHeaderSortChange,
            scope: me
        });

        me.modifyHeaderCt();
        me.items = [me.lockedGrid, me.normalGrid];

        me.relayHeaderCtEvents(lockedHeaderCt);
        me.relayHeaderCtEvents(normalHeaderCt);

        me.layout = {
            type: 'hbox',
            align: 'stretch'
        };
    },
    
    getLockingViewConfig: function(){
        return {
            xclass: 'Ext.grid.LockingView',
            locked: this.lockedGrid,
            normal: this.normalGrid,
            panel: this
        };
    },

    processColumns: function(columns){
        // split apart normal and lockedWidths
        var i = 0,
            len = columns.length,
            lockedWidth = 0,
            lockedHeaders = [],
            normalHeaders = [],
            column,
            result;

        for (; i < len; ++i) {
            column = columns[i];

            // Convert configs to Column objects because we mutate them, and we must not mutate passed in config objects in case they are re-used.
            if (!column.isComponent) {
                column = Ext.ComponentManager.create(columns[i], 'gridcolumn');
            }

            // mark the column as processed so that the locked attribute does not
            // trigger the locked subgrid to try to become a split lockable grid itself.
            column.processed = true;
            if (column.locked || column.autoLock) {
                // <debug>
                if (column.flex) {
                    Ext.Error.raise("Columns which are locked do NOT support a flex width. You must set a width on the " + columns[i].text + "column.");
                }
                // </debug>
                if (!column.hidden) {
                    lockedWidth += column.width || Ext.grid.header.Container.prototype.defaultWidth;
                }
                lockedHeaders.push(column);
            } else {
                normalHeaders.push(column);
            }
            if (!column.headerId) {
                column.headerId = (column.initialConfig || column).id || ('L' + (++this.headerCounter));
            }
        }
        result = {
            lockedWidth: lockedWidth,
            locked: {
                items: lockedHeaders,
                itemId: 'lockedHeaderCt',
                stretchMaxPartner: '^^>>#normalHeaderCt'
            },
            normal: {
                items: normalHeaders,
                itemId: 'normalHeaderCt',
                stretchMaxPartner: '^^>>#lockedHeaderCt'
            }
        };
        this.fireEvent('processcolumns', this, result.lockedHeaders, result.normalHeaders);
        return result;
    },

    // Due to automatic component border setting using inline style, to create the scrollbar-replacing
    // bottom border, we have to postprocess the locked view *after* render.
    // If there are visible normal columns, we do need the fat bottom border.
    afterLockedViewLayout: function() {
        var me = this,
            lockedView = me.lockedGrid.getView(),
            normalGrid = me.normalGrid,
            normalViewEl = normalGrid.getView().el.dom,
            spacerHeight = (this.normalGrid.headerCt.getVisibleGridColumns().length && normalViewEl.scrollWidth > normalViewEl.clientWidth ? Ext.getScrollbarSize().height : 0);

        lockedView.el.dom.style.borderBottomWidth = spacerHeight + 'px';
    },

    /**
     * @private
     * Listen for mousewheel events on the locked section which does not scroll.
     * Scroll it in response, and the other section will automatically sync.
     */
    onLockedViewMouseWheel: function(e) {
        var me = this,
            scrollDelta = -me.scrollDelta,
            deltaY = scrollDelta * e.getWheelDeltas().y,
            vertScrollerEl = me.lockedGrid.getView().el.dom,
            verticalCanScrollDown, verticalCanScrollUp;

        if (!me.ignoreMousewheel) {
            if (vertScrollerEl) {
                verticalCanScrollDown = vertScrollerEl.scrollTop !== vertScrollerEl.scrollHeight - vertScrollerEl.clientHeight;
                verticalCanScrollUp   = vertScrollerEl.scrollTop !== 0;
            }

            if ((deltaY < 0 && verticalCanScrollUp) || (deltaY > 0 && verticalCanScrollDown)) {
                e.stopEvent();

                // Inhibit processing of any scroll events we *may* cause here.
                // Some OSs do not fire a scroll event when we set the scrollTop of an overflow:hidden element,
                // so we invoke the scroll handler programatically below.
                vertScrollerEl.scrollTop += deltaY;
                me.normalGrid.getView().el.dom.scrollTop = vertScrollerEl.scrollTop;

                // Invoke the scroll event handler programatically to sync everything.
                me.onNormalViewScroll();
            }
        }
    },

    onLockedViewScroll: function() {
        var me = this,
            lockedView = me.lockedGrid.getView(),
            normalView = me.normalGrid.getView(),
            normalDom = normalView.el.dom,
            lockedDom = lockedView.el.dom,
            normalTable,
            lockedTable;

        // See onNormalViewScroll
        if (normalDom.scrollTop !== lockedDom.scrollTop) {
            normalDom.scrollTop = lockedDom.scrollTop;
    
            // For buffered views, the absolute position is important as well as scrollTop
            if (me.store.buffered) {
                lockedTable = lockedView.el.child('table', true);
                normalTable = normalView.el.child('table', true);
                normalTable.style.position = 'absolute';
                normalTable.style.top = lockedTable.style.top;
            }
        }
    },
    
    onNormalViewScroll: function() {
        var me = this,
            lockedView = me.lockedGrid.getView(),
            normalView = me.normalGrid.getView(),
            normalDom = normalView.el.dom,
            lockedDom = lockedView.el.dom,
            normalTable,
            lockedTable;

        // When we set the position, it will cause a scroll event on the other view, so we need to
        // check the top here. We can't just set a flag, like:
        // if (!me.scrolling) {
        //     me.scrolling = true;
        //     other.scrollTop = this.scrollTop;
        //     me.scrolling = false; 
        // }
        // The browser waits until the "thread" finishes before setting the
        // top, so by the time we set scrolling = false it hasn't hit the other
        // scroll event yet
        if (normalDom.scrollTop !== lockedDom.scrollTop) {
            lockedDom.scrollTop = normalDom.scrollTop;
    
            // For buffered views, the absolute position is important as well as scrollTop
            if (me.store.buffered) {
                lockedTable = lockedView.el.child('table', true);
                normalTable = normalView.el.child('table', true);
                lockedTable.style.position = 'absolute';
                lockedTable.style.top = normalTable.style.top;
            }
        }
    },

    // trigger a pseudo refresh on the normal side
    onLockedHeaderMove: function() {
        if (this.syncRowHeight) {
            this.onNormalViewRefresh();
        }
    },

    // trigger a pseudo refresh on the locked side
    onNormalHeaderMove: function() {
        if (this.syncRowHeight) {
            this.onLockedViewRefresh();
        }
    },

    // cache the heights of all locked rows and sync rowheights
    onLockedViewRefresh: function() {

        // Only bother if there are some columns in the normal grid to sync
        if (this.normalGrid.headerCt.getGridColumns().length) {
            var me     = this,
                view   = me.lockedGrid.getView(),
                el     = view.el,
                rowEls = el.query(view.getItemSelector()),
                ln     = rowEls.length,
                i = 0;
    
            // reset heights each time.
            me.lockedHeights = [];

            for (; i < ln; i++) {
                me.lockedHeights[i] = rowEls[i].offsetHeight;
            }
            me.syncRowHeights();
        }
    },

    // cache the heights of all normal rows and sync rowheights
    onNormalViewRefresh: function() {

        // Only bother if there are some columns in the locked grid to sync
        if (this.lockedGrid.headerCt.getGridColumns().length) {
            var me     = this,
                view   = me.normalGrid.getView(),
                el     = view.el,
                rowEls = el.query(view.getItemSelector()),
                ln     = rowEls.length,
                i = 0;
    
            // reset heights each time.
            me.normalHeights = [];
    
            for (; i < ln; i++) {
                me.normalHeights[i] = rowEls[i].offsetHeight;
            }
            me.syncRowHeights();
        }
    },

    // rows can get bigger/smaller
    onLockedViewItemUpdate: function(record, index, node) {

        // Only bother if there are some columns in the normal grid to sync
        if (this.normalGrid.headerCt.getGridColumns().length) {
            this.lockedHeights[index] = node.offsetHeight;
            this.syncRowHeights();
        }
    },

    // rows can get bigger/smaller
    onNormalViewItemUpdate: function(record, index, node) {
    
        // Only bother if there are some columns in the locked grid to sync
        if (this.lockedGrid.headerCt.getGridColumns().length) {
            this.normalHeights[index] = node.offsetHeight;
            this.syncRowHeights();
        }
    },

    /**
     * Synchronizes the row heights between the locked and non locked portion of the grid for each
     * row. If one row is smaller than the other, the height will be increased to match the larger one.
     */
    syncRowHeights: function() {
        var me = this,
            lockedHeights = me.lockedHeights,
            normalHeights = me.normalHeights,
            ln = lockedHeights.length,
            i  = 0,
            lockedView, normalView,
            lockedRowEls, normalRowEls,
            scrollTop;

        // ensure there are an equal num of locked and normal
        // rows before synchronization
        if (lockedHeights.length && normalHeights.length) {
            lockedView = me.lockedGrid.getView();
            normalView = me.normalGrid.getView();
            lockedRowEls = lockedView.el.query(lockedView.getItemSelector());
            normalRowEls = normalView.el.query(normalView.getItemSelector());

            // loop thru all of the heights and sync to the other side
            for (; i < ln; i++) {
                // ensure both are numbers
                if (!isNaN(lockedHeights[i]) && !isNaN(normalHeights[i])) {
                    if (lockedHeights[i] > normalHeights[i]) {
                        Ext.fly(normalRowEls[i]).setHeight(lockedHeights[i]);
                    } else if (lockedHeights[i] < normalHeights[i]) {
                        Ext.fly(lockedRowEls[i]).setHeight(normalHeights[i]);
                    }
                }
            }

            // Synchronize the scrollTop positions of the two views
            scrollTop = normalView.el.dom.scrollTop;
            normalView.el.dom.scrollTop = scrollTop;
            lockedView.el.dom.scrollTop = scrollTop;
            
            // reset the heights
            me.lockedHeights = [];
            me.normalHeights = [];
        }
    },

    // inject Lock and Unlock text
    // Hide/show Lock/Unlock options
    modifyHeaderCt: function() {
        var me = this;
        me.lockedGrid.headerCt.getMenuItems = me.getMenuItems(me.lockedGrid.headerCt.getMenuItems, true);
        me.normalGrid.headerCt.getMenuItems = me.getMenuItems(me.normalGrid.headerCt.getMenuItems, false);
        me.lockedGrid.headerCt.showMenuBy = Ext.Function.createInterceptor(me.lockedGrid.headerCt.showMenuBy, me.showMenuBy);
        me.normalGrid.headerCt.showMenuBy = Ext.Function.createInterceptor(me.normalGrid.headerCt.showMenuBy, me.showMenuBy);
    },

    onUnlockMenuClick: function() {
        this.unlock();
    },

    onLockMenuClick: function() {
        this.lock();
    },

    showMenuBy: function(t, header) {
        var menu = this.getMenu(),
            unlockItem  = menu.down('#unlockItem'),
            lockItem = menu.down('#lockItem'),
            sep = unlockItem.prev();

        if (header.lockable === false) {
            sep.hide();
            unlockItem.hide();
            lockItem.hide();
        } else {
            sep.show();
            unlockItem.show();
            lockItem.show();
            if (!unlockItem.initialConfig.disabled) {
                unlockItem.setDisabled(header.lockable === false);
            }
            if (!lockItem.initialConfig.disabled) {
                lockItem.setDisabled(!header.isLockable());
            }
        }
    },

    getMenuItems: function(getMenuItems, locked) {
        var me            = this,
            unlockText    = me.unlockText,
            lockText      = me.lockText,
            unlockCls     = Ext.baseCSSPrefix + 'hmenu-unlock',
            lockCls       = Ext.baseCSSPrefix + 'hmenu-lock',
            unlockHandler = Ext.Function.bind(me.onUnlockMenuClick, me),
            lockHandler   = Ext.Function.bind(me.onLockMenuClick, me);

        // runs in the scope of headerCt
        return function() {

            // We cannot use the method from HeaderContainer's prototype here
            // because other plugins or features may already have injected an implementation
            var o = getMenuItems.call(this);
            o.push('-', {
                itemId: 'unlockItem',
                cls: unlockCls,
                text: unlockText,
                handler: unlockHandler,
                disabled: !locked
            });
            o.push({
                itemId: 'lockItem',
                cls: lockCls,
                text: lockText,
                handler: lockHandler,
                disabled: locked
            });
            return o;
        };
    },

    /**
     * @private
     * Updates the overall view after columns have been resized, or moved from
     * the locked to unlocked side or vice-versa.
     * 
     * If all columns are removed from either side, that side must be hidden, and the
     * sole remaining column owning grid then becomes *the* grid. It must flex to occupy the
     * whole of the locking view. And it must also allow scrolling.
     * 
     * If columns are shared between the two sides, the *locked* grid shrinkwraps the
     * width of the visible locked columns while the normal grid flexes in what space remains.
     *
     * @return {Boolean} `true` if there are visible locked columns which need refreshing.
     *
     */
    syncLockedWidth: function() {
        var me = this,
            locked = me.lockedGrid,
            lockedView = locked.view,
            lockedViewEl = lockedView.el.dom,
            normal = me.normalGrid,
            lockedColCount = locked.headerCt.getVisibleGridColumns().length,
            normalColCount = normal.headerCt.getVisibleGridColumns().length

        Ext.suspendLayouts();

        // If there are still visible normal columns, then the normal grid will flex
        // while we effectively shrinkwrap the width of the locked columns
        if (normalColCount) {
            normal.show();
            if (lockedColCount) {

                // The locked grid hrinkwraps the total column width while the normal flexes in what remains
                delete locked.flex;
                locked.setWidth(locked.headerCt.getFullWidth(true));
                locked.addCls(me.lockedGridCls);
                locked.show();
            } else {
                // No visible locked columns: hide the locked grid
                locked.hide();
            }

            // Fix it so that the locked view is really locked
            lockedViewEl.style.overflow = 'hidden';
            lockedView.autoScroll = false;
            me.ignoreMousewheel = false;
        }

        // There are no normal grid columns. The "locked" grid has to be *the*
        // grid, and cannot have a shrinkwrapped width, but must flex the entire width.
        else {
            normal.hide();
            
            // When the normal grid is hidden, we no longer need the bottom border "scrollbar replacement"
            lockedViewEl.style.borderBottomWidth = '0';

            // The locked now becomes *the* grid and has to flex to occupy the full view width
            locked.flex = 1;
            delete locked.width;
            locked.removeCls(me.lockedGridCls);
            locked.show();

            // Fix it so that the "locked" view can scroll. Because it is the only grid view visible now.
            lockedViewEl.style.overflow = 'auto';
            lockedView.autoScroll = true;
            me.ignoreMousewheel = true;
        }
        Ext.resumeLayouts(true);
        return [lockedColCount, normalColCount];
    },

    onLockedHeaderAdd: function() {
        // Columns can be added to the locked grid whwen reconfiguring or during a lock
        // operation when syncLockedWidth will be called anyway, so allow adding to be ignored
        if (!this.ignoreAddLockedColumn) {
            this.syncLockedWidth();
        }
    },

    onLockedHeaderResize: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderHide: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderShow: function() {
        this.syncLockedWidth();
    },

    onLockedHeaderSortChange: function(headerCt, header, sortState) {
        if (sortState) {
            // no real header, and silence the event so we dont get into an
            // infinite loop
            this.normalGrid.headerCt.clearOtherSortStates(null, true);
        }
    },

    onNormalHeaderSortChange: function(headerCt, header, sortState) {
        if (sortState) {
            // no real header, and silence the event so we dont get into an
            // infinite loop
            this.lockedGrid.headerCt.clearOtherSortStates(null, true);
        }
    },

    // going from unlocked section to locked
    /**
     * Locks the activeHeader as determined by which menu is open OR a header
     * as specified.
     * @param {Ext.grid.column.Column} [header] Header to unlock from the locked section.
     * Defaults to the header which has the menu open currently.
     * @param {Number} [toIdx] The index to move the unlocked header to.
     * Defaults to appending as the last item.
     * @private
     */
    lock: function(activeHd, toIdx) {
        var me         = this,
            normalGrid = me.normalGrid,
            lockedGrid = me.lockedGrid,
            normalHCt  = normalGrid.headerCt,
            lockedHCt  = lockedGrid.headerCt,
            refreshFlags,
            ownerCt;

        activeHd = activeHd || normalHCt.getMenu().activeHeader;
        ownerCt = activeHd.ownerCt;

        // if column was previously flexed, get/set current width
        // and remove the flex
        if (activeHd.flex) {
            activeHd.width = activeHd.getWidth();
            delete activeHd.flex;
        }

        Ext.suspendLayouts();
        ownerCt.remove(activeHd, false);

        // Removed the last child of a group - remove the group
        if (ownerCt.isGroupHeader && !ownerCt.items.getCount()) {
            ownerCt.ownerCt.remove(ownerCt);
        }
        activeHd.locked = true;

        // Flag to the locked column add listener to do nothing
        me.ignoreAddLockedColumn = true;
        if (Ext.isDefined(toIdx)) {
            lockedHCt.insert(toIdx, activeHd);
        } else {
            lockedHCt.add(activeHd);
        }
        me.ignoreAddLockedColumn = false;

        refreshFlags = me.syncLockedWidth();
        if (refreshFlags[0]) {
            lockedGrid.getView().refresh();
        }
        if (refreshFlags[1]) {
            normalGrid.getView().refresh();
        }
        Ext.resumeLayouts(true);

        me.fireEvent('lockcolumn', me, activeHd);
    },

    // going from locked section to unlocked
    /**
     * Unlocks the activeHeader as determined by which menu is open OR a header
     * as specified.
     * @param {Ext.grid.column.Column} [header] Header to unlock from the locked section.
     * Defaults to the header which has the menu open currently.
     * @param {Number} [toIdx=0] The index to move the unlocked header to.
     * @private
     */
    unlock: function(activeHd, toIdx) {
        var me         = this,
            normalGrid = me.normalGrid,
            lockedGrid = me.lockedGrid,
            normalHCt  = normalGrid.headerCt,
            lockedHCt  = lockedGrid.headerCt,
            refreshFlags;

        // Unlocking; user expectation is that the unlocked column is inserted at the beginning.
        if (!Ext.isDefined(toIdx)) {
            toIdx = 0;
        }
        activeHd = activeHd || lockedHCt.getMenu().activeHeader;

        Ext.suspendLayouts();
        activeHd.ownerCt.remove(activeHd, false);
        activeHd.locked = false;
        normalHCt.insert(toIdx, activeHd);

        // syncLockedWidth returns visible column counts for both grids.
        // only refresh what needs refreshing
        refreshFlags = me.syncLockedWidth();

        if (refreshFlags[0]) {
            lockedGrid.getView().refresh();
        }
        if (refreshFlags[1]) {
            normalGrid.getView().refresh();
        }
        Ext.resumeLayouts(true);

        me.fireEvent('unlockcolumn', me, activeHd);
    },

    applyColumnsState: function (columns) {
        var me             = this,
            lockedGrid     = me.lockedGrid,
            lockedHeaderCt = lockedGrid.headerCt,
            normalHeaderCt = me.normalGrid.headerCt,
            lockedCols     = Ext.Array.toMap(lockedHeaderCt.items, 'headerId'),
            normalCols     = Ext.Array.toMap(normalHeaderCt.items, 'headerId'),
            locked         = [],
            normal         = [],
            lockedWidth    = 1,
            length         = columns.length,
            i, existing,
            lockedDefault,
            col;

        for (i = 0; i < length; i++) {
            col = columns[i];

            lockedDefault = lockedCols[col.id];
            existing = lockedDefault || normalCols[col.id];

            if (existing) {
                if (existing.applyColumnState) {
                    existing.applyColumnState(col);
                }
                if (existing.locked === undefined) {
                    existing.locked = !!lockedDefault;
                }
                if (existing.locked) {
                    locked.push(existing);
                    if (!existing.hidden && typeof existing.width == 'number') {
                        lockedWidth += existing.width;
                    }
                } else {
                    normal.push(existing);
                }
            }
        }

        // state and config must have the same columns (compare counts for now):
        if (locked.length + normal.length == lockedHeaderCt.items.getCount() + normalHeaderCt.items.getCount()) {
            lockedHeaderCt.removeAll(false);
            normalHeaderCt.removeAll(false);

            lockedHeaderCt.add(locked);
            normalHeaderCt.add(normal);

            lockedGrid.setWidth(lockedWidth);
        }
    },

    getColumnsState: function () {
        var me = this,
            locked = me.lockedGrid.headerCt.getColumnsState(),
            normal = me.normalGrid.headerCt.getColumnsState();

        return locked.concat(normal);
    },

    // we want to totally override the reconfigure behaviour here, since we're creating 2 sub-grids
    reconfigureLockable: function(store, columns) {
        var me = this,
            lockedGrid = me.lockedGrid,
            normalGrid = me.normalGrid;

        Ext.suspendLayouts();
        if (columns) {
            lockedGrid.headerCt.removeAll();
            normalGrid.headerCt.removeAll();

            columns = me.processColumns(columns);

            // Flag to the locked column add listener to do nothing
            me.ignoreAddLockedColumn = true;
            lockedGrid.headerCt.add(columns.locked.items);
            me.ignoreAddLockedColumn = false;
            normalGrid.headerCt.add(columns.normal.items);

            // Ensure locked grid is set up correctly with correct width and bottom border,
            // and that both grids' visibility and scrollability status is correct
            me.syncLockedWidth();
        }

        if (store) {
            store = Ext.data.StoreManager.lookup(store);
            me.store = store;
            lockedGrid.bindStore(store);
            normalGrid.bindStore(store);
        } else {
            lockedGrid.getView().refresh();
            normalGrid.getView().refresh();
        }
        Ext.resumeLayouts(true);
    },

    constructLockableFeatures: function() {
        var features = this.features,
            feature,
            featureClone,
            lockedFeatures,
            normalFeatures,
            i = 0, len;
        
        if (features) {
            lockedFeatures = [];
            normalFeatures = [];
            len = features.length;
            for (; i < len; i++) {
                feature = features[i];
                if (!feature.isFeature) {
                    feature = Ext.create('feature.' + feature.ftype, feature);
                }
                switch (feature.lockableScope) {
                    case 'locked':
                        lockedFeatures.push(feature);
                        break;
                    case 'normal':
                        normalFeatures.push(feature);
                        break;
                    default:
                        lockedFeatures.push(feature);
                        normalFeatures.push(featureClone = feature.clone());

                        // When cloned to either side, each gets a "lockingPartner" reference to the other
                        featureClone.lockingPartner = feature;
                        feature.lockingPartner = featureClone;
                }
            }
        }
        return {
            normalFeatures: normalFeatures,
            lockedFeatures: lockedFeatures
        };
    },

    constructLockablePlugins: function() {
        var plugins = this.plugins,
            plugin,
            pluginClone,
            topPlugins,
            lockedPlugins,
            normalPlugins,
            i = 0, len;
        
        if (plugins) {
            topPlugins = [];
            lockedPlugins = [];
            normalPlugins = [];
            len = plugins.length;
            for (; i < len; i++) {
                plugin = this.constructPlugin(plugins[i]);
                switch (plugin.lockableScope) {
                    case 'both':
                        lockedPlugins.push(plugin);
                        normalPlugins.push(pluginClone = plugin.clone());

                        // When cloned to both sides, each gets a "lockingPartner" reference to the other
                        plugin.lockingPartner = pluginClone;
                        pluginClone.lockingPartner = plugin;
                        break;
                    case 'locked':
                        lockedPlugins.push(plugin);
                        break;
                    case 'normal':
                        normalPlugins.push(plugin);
                        break;
                    default:
                        topPlugins.push(plugin);
                }
            }
        }
        return {
            topPlugins:    topPlugins,
            normalPlugins: normalPlugins,
            lockedPlugins: lockedPlugins
        };
    }
}, function() {
    this.borrow(Ext.AbstractComponent, ['constructPlugin']);
});
