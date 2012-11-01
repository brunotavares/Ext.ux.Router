/**
 * Implements infinite scrolling of a grid, allowing users can scroll
 * through thousands of records without the performance penalties of
 * renderering all the records on screen at once. The grid should be
 * bound to a *buffered* store with a pageSize specified.
 *
 * The number of rows rendered outside the visible area, and the
 * buffering of pages of data from the remote server for immediate
 * rendering upon scroll can be controlled by configuring the
 * {@link Ext.grid.PagingScroller #verticalScroller}.
 *
 * You can tell it to create a larger table to provide more scrolling
 * before a refresh is needed, and also to keep more pages of records
 * in memory for faster refreshing when scrolling.
 *
 *     var myStore = Ext.create('Ext.data.Store', {
 *         // ...
 *         buffered: true,
 *         pageSize: 100,
 *         // ...
 *     });
 *
 *     var grid = Ext.create('Ext.grid.Panel', {
 *         // ...
 *         autoLoad: true,
 *         verticalScroller: {
 *             trailingBufferZone: 200,  // Keep 200 records buffered in memory behind scroll
 *             leadingBufferZone: 5000   // Keep 5000 records buffered in memory ahead of scroll
 *         },
 *         // ...
 *     });
 *
 * ## Implementation notes
 *
 * This class monitors scrolling of the {@link Ext.view.Table
 * TableView} within a {@link Ext.grid.Panel GridPanel} which is using
 * a buffered store to only cache and render a small section of a very
 * large dataset.
 *
 * **NB!** The GridPanel will instantiate this to perform monitoring,
 * this class should never be instantiated by user code.  Always use the
 * {@link Ext.panel.Table#verticalScroller verticalScroller} config.
 *
 */
Ext.define('Ext.grid.PagingScroller', {

    /**
     * @cfg
     * @deprecated This config is now ignored.
     */
    percentageFromEdge: 0.35,

    /**
     * @cfg {Boolean} [variableRowHeight=false]
     * Configure as `true` if the row heights are not all the same height as the first row. Only configure this is needed - this will be if the
     * rows contain unpredictably sized data, or you have changed the cell's text overflow stype to `'wrap'`.
     */
    variableRowHeight: false,

    /**
     * @cfg
     * The zone which causes a refresh of the rendered viewport. As soon as the edge
     * of the rendered grid is this number of rows from the edge of the viewport, the view is moved.
     */
    numFromEdge: 2,

    /**
     * @cfg
     * The number of extra rows to render on the trailing side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    trailingBufferZone: 5,

    /**
     * @cfg
     * The number of extra rows to render on the leading side of scrolling
     * **outside the {@link #numFromEdge}** buffer as scrolling proceeds.
     */
    leadingBufferZone: 15,

    /**
     * @cfg
     * This is the time in milliseconds to buffer load requests when scrolling the PagingScrollbar.
     */
    scrollToLoadBuffer: 200,

    // private. Initial value of zero.
    viewSize: 0,
    // private. Start at default value
    rowHeight: 21,
    // private. Table extent at startup time
    tableStart: 0,
    tableEnd: 0,

    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);
        me.bindView(config.view);
        me.callParent(arguments);
    },

    bindView: function(view) {
        var me = this,
            viewListeners = {
                scroll: {
                    fn: me.onViewScroll,
                    element: 'el',
                    scope: me
                },
                render: {
                    fn: me.onViewRender,
                    scope: me,
                    single: true
                },
                resize: me.onViewResize,
                boxready: {
                    fn: me.onViewResize,
                    scope: me,
                    single: true
                },

                // If there are variable row heights, then in beforeRefresh, we have to find a common
                // row so that we can synchronize the table's top position after the refresh.
                // Also flag whether the grid view has focus so that it can be refocused after refresh.
                beforerefresh: me.beforeViewRefresh,

                refresh: me.onViewRefresh,
                scope: me,
                destroyable: true
            },
            storeListeners = {
                guaranteedrange: me.onGuaranteedRange,
                scope: me,
                destroyable: true
            }, partner;

        me.view = view;
        me.grid = me.view.up('tablepanel');
        me.store = view.store;

        // Binding to a rendered view, we do not have to listen for render - process it now.
        if (view.rendered) {
            delete viewListeners.render;
            me.store.setViewSize(me.viewSize = Math.ceil(view.getHeight() / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone);
            me.onViewRender();
        }
        
        partner = view.lockingPartner;
        if (partner) {
            partner.on('refresh', me.onLockRefresh, me);
        }

        me.view.mon(me.store.pageMap, {
            scope: me,
            clear: me.onCacheClear
        });

        // During scrolling we do not need to refresh the height - the Grid height must be set by config or layout in order to create a scrollable
        // table just larger than that, so removing the layout call improves efficiency and removes the flicker when the
        // HeaderContainer is reset to scrollLeft:0, and then resynced on the very next "scroll" event.
        me.view.refreshSize = Ext.Function.createInterceptor(me.view.refreshSize, me.beforeViewrefreshSize, me);

        /**
         * @property {Number} position
         * Current pixel scroll position of the associated {@link Ext.view.Table View}.
         */
        me.position = 0;

        // We are created in View constructor. There won't be an ownerCt at this time.
        if (!me.grid) {
            me.view.on({
                added: function() {
                    me.grid = me.view.up('tablepanel');
                },
                single: true
            });
        }

        me.viewListeners = me.view.on(viewListeners);
        me.storeListeners = me.store.on(storeListeners);
    },

    unbindView: function() {
        var me = this,
            partner,
            view = me.view;

        // If we need unbinding...
        if (view) {
            if (view.el) {
                view.el.un('scroll', me.onViewScroll, me); // un does not understand the element options

                // Relieve the departing view of the extra stretcher el
                if (me.stretcher.dom && (me.stretcher.dom.parentNode === view.el.dom)) {
                    view.fixedNodes -= 1;
                    me.stretcher.remove();
                }
            }

            partner = view.lockingPartner;
            if (partner) {
                partner.un('refresh', me.onLockRefresh, me);
            }

            delete view.refreshSize; // Remove the injected refreshSize implementation

            // The view's rowHeight needs recalculating
            delete me.rowHeight;

        }

        // Remove listeners from old grid, view and store
        Ext.destroy(me.viewListeners, me.storeListeners);
    },

    onCacheClear: function() {
        var me = this;

        // Do not do anything if view is not rendered, or if the reason for cache clearing is store destruction
        if (me.view.rendered && !me.store.isDestroyed) {
            // Temporarily disable scroll monitoring until the scroll event caused by any following *change* of scrollTop has fired.
            // Otherwise it will attempt to process a scroll on a stale view
            me.ignoreNextScrollEvent = me.view.el.dom.scrollTop !== 0;

            me.view.el.dom.scrollTop = 0;
            delete me.lastScrollDirection;
            delete me.scrollOffset;
            delete me.scrollProportion;
            delete me.rowHeight;
            if (me.stretcher) {
                me.stretcher.setHeight(0);
            }
        }
    },

    // Ensure that the stretcher element is inserted into the View as the first element.
    onViewRender: function() {
        var me = this,
            view = me.view,
            stretcher;

        me.stretcher = me.createStretcher(view);
        
        view = view.lockingPartner;
        if (view) {
            stretcher = me.stretcher;
            me.stretcher = new Ext.CompositeElement(stretcher);
            me.stretcher.add(me.createStretcher(view));
        }
    },

    createStretcher: function(view) {
        var el = view.el;
        el.setStyle('position', 'relative');

        // If the view has already been refreshed by the time we get here (eg, the grid, has undergone a reconfigure operation - which performs a refresh),
        // keep it informed of fixed nodes which it must leave alone on refresh.
        if (view.refreshCounter) {
            view.fixedNodes++;
        }
        return el.createChild({
            style: {
                position: 'absolute',
                width: '1px',
                height: view.refreshCounter ? this.getScrollHeight() + 'px' : 0,
                top: 0,
                left: 0
            }
        }, el.dom.firstChild);
    },

    onViewResize: function(view, width, height) {
        var me = this,
            newViewSize = me.viewSize = Math.ceil(height / me.rowHeight) + me.trailingBufferZone + (me.numFromEdge * 2) + me.leadingBufferZone;

        // Inform the store. The store trims any trailing records.
        // The reason being that if the store was not bound when initially loaded, it would not have known what view size
        // to load, so it loads one entire page. This then needs cutting back when the view's height is known.
        me.store.setViewSize(newViewSize);

        // Cutting the Store down, we must keep our table end pointer correct
        me.tableEnd = me.tableStart + newViewSize - 1;
        me.handleViewScroll(me.lastScrollDirection || 1);
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    beforeViewRefresh: function() {
        var me = this,
            view = me.view,
            rows,
            direction;

        // Refreshing can cause loss of focus.
        me.focusOnRefresh = Ext.Element.getActiveElement === view.el.dom;

        // Only need all this is variableRowHeight
        if (me.variableRowHeight) {
            direction = me.lastScrollDirection;
            me.commonRecordIndex = undefined;
            // If we are refreshing in response to a scroll,
            // And we know where the previous start was,
            // and we're not teleporting out of visible range
            // and the view is not empty
            if (direction && (me.previousStart !== undefined) && (me.scrollProportion === undefined) && (rows = view.getNodes()).length) {

                // We have scrolled downwards
                if (direction === 1) {

                    // If the ranges overlap, we are going to be able to position the table exactly
                    if (me.tableStart <= me.previousEnd) {
                        me.commonRecordIndex = rows.length - 1;

                    }
                }
                // We have scrolled upwards
                else if (direction === -1) {

                    // If the ranges overlap, we are going to be able to position the table exactly
                    if (me.tableEnd >= me.previousStart) {
                        me.commonRecordIndex = 0;
                    }
                }
                // Cache the old offset of the common row from the scrollTop
                me.scrollOffset = -view.el.getOffsetsTo(rows[me.commonRecordIndex])[1];

                // In the new table the common row is at a different index
                me.commonRecordIndex -= (me.tableStart - me.previousStart);
            } else {
                me.scrollOffset = undefined;
            }
        }
    },

    onLockRefresh: function(view) {
        view.table.dom.style.position = 'absolute';
    },

    // Used for variable row heights. Try to find the offset from scrollTop of a common row
    // Ensure, upon each refresh, that the stretcher element is the correct height
    onViewRefresh: function() {
        var me = this,
            store = me.store,
            newScrollHeight,
            view = me.view,
            viewEl = view.el,
            viewDom = viewEl.dom,
            rows,
            newScrollOffset,
            scrollDelta,
            table = view.table.dom,
            tableTop,
            scrollTop;

        // Refresh causes loss of focus
        if (me.focusOnRefresh) {
            viewEl.focus();
            me.focusOnRefresh = false;
        }

        // Scroll events caused by processing in here must be ignored, so disable for the duration
        me.disabled = true;

        // No scroll monitoring is needed if
        //    All data is in view OR
        //  Store is filtered locally.
        //    - scrolling a locally filtered page is obv a local operation within the context of a huge set of pages 
        //      so local scrolling is appropriate.
        if (store.getCount() === store.getTotalCount() || (store.isFiltered() && !store.remoteFilter)) {
            me.stretcher.setHeight(0);
            me.position = viewDom.scrollTop = 0;

            // Chrome's scrolling went crazy upon zeroing of the stretcher, and left the view's scrollTop stuck at -15
            // This is the only thing that fixes that
            me.setTablePosition('absolute');

            // We remain disabled now because no scrolling is needed - we have the full dataset in the Store
            return;
        }

        me.stretcher.setHeight(newScrollHeight = me.getScrollHeight());

        scrollTop = viewDom.scrollTop;

        // Flag to the refreshSize interceptor that regular refreshSize postprocessing should be vetoed.
        me.isScrollRefresh = (scrollTop > 0);

        // If we have had to calculate the store position from the pure scroll bar position,
        // then we must calculate the table's vertical position from the scrollProportion
        if (me.scrollProportion !== undefined) {
            me.setTablePosition('absolute');
            me.setTableTop((me.scrollProportion && me.tableStart > 0 ? (newScrollHeight * me.scrollProportion) - (table.offsetHeight * me.scrollProportion) : 0) + 'px');
        } else {
            me.setTablePosition('absolute');
            me.setTableTop((tableTop = (me.tableStart||0) * me.rowHeight) + 'px');

            // ScrollOffset to a common row was calculated in beforeViewRefresh, so we can synch table position with how it was before
            if (me.scrollOffset) {
                rows = view.getNodes();
                newScrollOffset = -viewEl.getOffsetsTo(rows[me.commonRecordIndex])[1];
                scrollDelta = newScrollOffset - me.scrollOffset;
                me.position = (viewDom.scrollTop += scrollDelta);
            }

            // If the table is not fully in view view, scroll to where it is in view.
            // This will happen when the page goes out of view unexpectedly, outside the
            // control of the PagingScroller. For example, a refresh caused by a remote sort or filter reverting
            // back to page 1.
            // Note that with buffered Stores, only remote sorting is allowed, otherwise the locally
            // sorted page will be out of order with the whole dataset.
            else if ((tableTop > scrollTop) || ((tableTop + table.offsetHeight) < scrollTop + viewDom.clientHeight)) {
                me.lastScrollDirection = -1;
                me.position = viewDom.scrollTop = tableTop;
            }
        }

        // Re-enable upon function exit
        me.disabled = false;
    },
    
    setTablePosition: function(position) {
        this.setViewTableStyle(this.view, 'position', position);
    },
    
    setTableTop: function(top){
        this.setViewTableStyle(this.view, 'top', top);
    },
    
    setViewTableStyle: function(view, prop, value) {
        view.el.child('table', true).style[prop] = value;
        view = view.lockingPartner;
        
        if (view) {
            view.el.child('table', true).style[prop] = value;
        }
    },

    beforeViewrefreshSize: function() {
        // Veto the refreshSize if the refresh is due to a scroll.
        if (this.isScrollRefresh) {
            // If we're vetoing refreshSize, attach the table DOM to the View's Flyweight.
            this.view.table.attach(this.view.el.child('table', true));
            return (this.isScrollRefresh = false);
        }
    },

    /**
     * Scrolls to and optionlly selects the specified row index **in the total dataset**.
     * 
     * @param {Number} recordIdx The zero-based position in the dataset to scroll to.
     * @param {Boolean} doSelect Pass as `true` to select the specified row.
     * @param {Function} callback A function to call when the row has been scrolled to.
     * @param {Number} callback.recordIdx The resulting record index (may have changed if the passed index was outside the valid range).
     * @param {Ext.data.Model} callback.record The resulting record from the store.
     * @param {Object} scope The scope (`this` reference) in which to execute the callback. Defaults to this PagingScroller.
     * 
     */
    scrollTo: function(recordIdx, doSelect, callback, scope) {
        var me = this,
            view = me.view,
            viewDom = view.el.dom,
            store = me.store,
            total = store.getTotalCount(),
            startIdx, endIdx,
            targetRec,
            tableTop;

        // Sanitize the requested record
        recordIdx = Math.min(Math.max(recordIdx, 0), total - 1);

        // Calculate view start index
        startIdx = Math.max(Math.min(recordIdx - ((me.leadingBufferZone + me.trailingBufferZone) / 2), total - me.viewSize + 1), 0);
        tableTop = startIdx * me.rowHeight;
        endIdx = startIdx + me.viewSize - 1;

        // So that we will not attempt to find any common row between refreshes which may not exist
        me.lastScrollDirection = undefined;

        me.disabled = true;
        store.guaranteeRange(startIdx, endIdx, function() {
            targetRec = store.pageMap.getRange(recordIdx, recordIdx)[0];
            view.table.dom.style.top = tableTop + 'px';
            viewDom.scrollTop = tableTop = Math.min(Math.max(0, tableTop - view.table.getOffsetsTo(view.getNode(targetRec))[1]), viewDom.scrollHeight - viewDom.clientHeight);

            // https://sencha.jira.com/browse/EXTJSIV-7166 IE 6, 7 and 8 won't scroll all the way down first time
            if (Ext.isIE) {
                viewDom.scrollTop = tableTop;
            }
            me.disabled = false;
            if (doSelect) {
                me.grid.selModel.select(targetRec);
            }
            if (callback) {
                callback.call(scope||me, recordIdx, targetRec);
            }
        });
    },

    onGuaranteedRange: function(range, start, end, options) {
        var me = this,
            ds = me.store;

        // this should never happen
        if (range.length && me.visibleStart < range[0].index) {
            return;
        }

        // Cache last table position in dataset so that if we are using variableRowHeight,
        // we can attempt to locate a common row to align the table on.
        me.previousStart = me.tableStart;
        me.previousEnd = me.tableEnd;

        me.tableStart = start;
        me.tableEnd = end;

        // Skip generation of template in the refresh caused by scroll if there has been at least one refresh.
        me.view.skipNewTemplate = !!me.view.refreshCounter;
        ds.loadRecords(range, Ext.apply({
            start: start
        }, options));
        me.view.skipNewTemplate = false;
    },

    onViewScroll: function(e, t) {
        var me = this,
            view = me.view,
            lastPosition = me.position;

        me.position = view.el.dom.scrollTop;

        // Flag set when the scrollTop is programatically set to zero upon cache clear.
        // We must not attempt to process that as a scroll event.
        if (me.ignoreNextScrollEvent) {
            me.ignoreNextScrollEvent = false;
            return;
        }

        // Only check for nearing the edge if we are enabled.
        // If there is no paging to be done (Store's dataset is all in memory) we will be disabled.
        if (!me.disabled) {
            me.lastScrollDirection = me.position > lastPosition ? 1 : -1;
            // Check the position so we ignore horizontal scrolling
            if (lastPosition !== me.position) {
                me.handleViewScroll(me.lastScrollDirection);
            }
        }
    },

    handleViewScroll: function(direction) {
        var me                = this,
            store             = me.store,
            view              = me.view,
            viewSize          = me.viewSize,
            totalCount        = store.getTotalCount(),
            highestStartPoint = totalCount - viewSize,
            visibleStart      = me.getFirstVisibleRowIndex(),
            visibleEnd        = me.getLastVisibleRowIndex(),
            el                = view.el.dom,
            requestStart,
            requestEnd;

        // Only process if the total rows is larger than the visible page size
        if (totalCount >= viewSize) {

            // This is only set if we are using variable row height, and the thumb is dragged so that
            // There are no remaining visible rows to vertically anchor the new table to.
            // In this case we use the scrollProprtion to anchor the table to the correct relative
            // position on the vertical axis.
            me.scrollProportion = undefined;

            // We're scrolling up
            if (direction == -1) {

                // If table starts at record zero, we have nothing to do
                if (me.tableStart) {
                    if (visibleStart !== undefined) {
                        if (visibleStart < (me.tableStart + me.numFromEdge)) {
                            requestStart = Math.max(0, visibleEnd + me.trailingBufferZone - viewSize);
                        }
                    }

                    // The only way we can end up without a visible start is if, in variableRowHeight mode, the user drags
                    // the thumb up out of the visible range. In this case, we have to estimate the start row index
                    else {
                        // If we have no visible rows to orientate with, then use the scroll proportion
                        me.scrollProportion = el.scrollTop / (el.scrollHeight - el.clientHeight);
                        requestStart = Math.max(0, totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2));
                    }
                }
            }
            // We're scrolling down
            else {
                if (visibleStart !== undefined) {
                    if (visibleEnd > (me.tableEnd - me.numFromEdge)) {
                        requestStart = Math.max(0, visibleStart - me.trailingBufferZone);
                    }
                }

                // The only way we can end up without a visible end is if, in variableRowHeight mode, the user drags
                // the thumb down out of the visible range. In this case, we have to estimate the start row index
                else {
                    // If we have no visible rows to orientate with, then use the scroll proportion
                    me.scrollProportion = el.scrollTop / (el.scrollHeight - el.clientHeight);
                    requestStart = totalCount * me.scrollProportion - (viewSize / 2) - me.numFromEdge - ((me.leadingBufferZone + me.trailingBufferZone) / 2);
                }
            }

            // We scrolled close to the edge and the Store needs reloading
            if (requestStart !== undefined) {
                // The calculation walked off the end; Request the highest possible chunk which starts on an even row count (Because of row striping)
                if (requestStart > highestStartPoint) {
                    requestStart = highestStartPoint & ~1;
                    requestEnd = totalCount - 1;
                }
                // Make sure first row is even to ensure correct even/odd row striping
                else {
                    requestStart = requestStart & ~1;
                    requestEnd = requestStart + viewSize - 1;
                }

                // If range is satsfied within the prefetch buffer, then just draw it from the prefetch buffer
                if (store.rangeCached(requestStart, requestEnd)) {
                    me.cancelLoad();
                    store.guaranteeRange(requestStart, requestEnd);
                }

                // Required range is not in the prefetch buffer. Ask the store to prefetch it.
                // We will recieve a guaranteedrange event when that is done.
                else {
                    me.attemptLoad(requestStart, requestEnd);
                }
            }
        }
    },

    getFirstVisibleRowIndex: function() {
        var me = this,
            view = me.view,
            scrollTop = view.el.dom.scrollTop,
            rows,
            count,
            i,
            rowBottom,
            grouped = me.store.isGrouped();

        if (me.variableRowHeight) {
            rows = view.getNodes();
            count = rows.length;
            if (!count) {
                return;
            }
            rowBottom = Ext.fly(rows[0]).getOffsetsTo(view.el)[1];
            for (i = 0; i < count; i++) {
                // If we are grouped then we cannot be sure that the rows are contiguous, so cannot step down from the top row pos by row
                // heights, but must find the offset to each one.
                if (grouped) {
                    rowBottom = Ext.fly(rows[i]).getOffsetsTo(view.el)[1];
                }
                rowBottom += rows[i].offsetHeight;
 
                // Searching for the first visible row, and off the bottom of the clientArea, then there's no visible first row!
                if (rowBottom > view.el.dom.clientHeight) {
                    return;
                }

                // Return the index *within the total dataset* of the first visible row
                // We cannot use the loop index to offset from the table's start index because of possible intervening group headers.
                if (rowBottom > 0) {
                    return view.getRecord(rows[i]).index;
                }
            }
        } else {
            return Math.floor(scrollTop / me.rowHeight);
        }
    },

    getLastVisibleRowIndex: function() {
        var me = this,
            store = me.store,
            view = me.view,
            clientHeight = view.el.dom.clientHeight,
            rows,
            count,
            i,
            rowTop,
            grouped = me.store.isGrouped();

        if (me.variableRowHeight) {
            rows = view.getNodes();
            if (!rows.length) {
                return;
            }
            count = store.getCount() - 1;
            rowTop = Ext.fly(rows[count]).getOffsetsTo(view.el)[1] + rows[count].offsetHeight;
            for (i = count; i >= 0; i--) {
                // If we are grouped then we cannot be sure that the rows are contiguous, so cannot step upwards from the last row pos by row
                // heights, but must find the offset to each one.
                if (grouped) {
                    rowTop = Ext.fly(rows[i]).getOffsetsTo(view.el)[1];
                } else {
                    rowTop -= rows[i].offsetHeight;
                }

                // Searching for the last visible row, and off the top of the clientArea, then there's no visible last row!
                if (rowTop < 0) {
                    return;
                }

                // Return the index *within the total dataset* of the last visible row.
                // We cannot use the loop index to offset from the table's start index because of possible intervening group headers.
                if (rowTop < clientHeight) {
                    return view.getRecord(rows[i]).index;
                }
            }
        } else {
            return me.getFirstVisibleRowIndex() + Math.ceil(clientHeight / me.rowHeight) + 1;
        }
    },

    getScrollHeight: function() {
        var me = this,
            view   = me.view,
            table,
            firstRow,
            store  = me.store,
            deltaHeight = 0,
            doCalcHeight = !me.hasOwnProperty('rowHeight'),
            storeCount = me.store.getCount();

        if (!storeCount) {
            return 0;
        }
        if (me.variableRowHeight) {
            table = me.view.table.dom;
            if (doCalcHeight) {
                me.initialTableHeight = table.offsetHeight;
                me.rowHeight = me.initialTableHeight / storeCount;
            } else {
                deltaHeight = table.offsetHeight - me.initialTableHeight;

                // Store size has been bumped because of odd end row.
                if (store.getCount() > me.viewSize) {
                    deltaHeight -= me.rowHeight;
                }
            }
        } else if (doCalcHeight) {
            firstRow = view.el.down(view.getItemSelector());
            if (firstRow) {
                me.rowHeight = firstRow.getHeight(false, true);
            }
        }

        return Math.floor(store.getTotalCount() * me.rowHeight) + deltaHeight;
    },

    attemptLoad: function(start, end) {
        var me = this;
        if (me.scrollToLoadBuffer) {
            if (!me.loadTask) {
                me.loadTask = new Ext.util.DelayedTask(me.doAttemptLoad, me, []);
            }
            me.loadTask.delay(me.scrollToLoadBuffer, me.doAttemptLoad, me, [start, end]);
        } else {
            me.store.guaranteeRange(start, end);
        }
    },

    cancelLoad: function() {
        if (this.loadTask) {
            this.loadTask.cancel();
        }
    },

    doAttemptLoad:  function(start, end) {
        this.store.guaranteeRange(start, end);
    },

    destroy: function() {
        this.unbindView();
    }
});
