/**
AxisStratigraphy
*/
Flog2.AxisStratigraphy = (function(base) {
    extend(base, AxisStratigraphy);

    /** @constructor */
    function AxisStratigraphy (c) {
        this.cls = c.cls||"f2-axis-stratigraphy";
        this.height = c.height;
        this.width = c.width||10;
        this.cellWidth = c.cellWidth||30;
        this.minDepth = c.minDepth||null;
        this.maxDepth = c.maxDepth||null;
        this.hooks = c.hooks||null;
        this.src = c.src||null;
        this.dataType = c.dataType||"tsv";            // Data type if 
        this.data = !c.src && c.data ? c.data : null; // If no external source is given, data array from config object is expected
        this.cols = c.cols||null;                     // {depth_top:"my_depth_top",depth_base:"my_depth_base",level:"my_level"};

        this.isVisible = this.isVisible||true;

        this.styles = {
            "axis-stratigraphy-rect": "stroke-width:1;stroke:rgb(0,0,0);",
            "axis-stratigraphy-text": "font-family:arial;font-size:10px",
            "axis-stratigraphy-depthtext": "font-family:arial;font-size:10px"
        }
        this.style(c.styles);

        this.dom = {module:null, 
                    content:null,
                    rects:null,
                    texts:null,
                    depths:null};
    }

    /**
    After an ajax call it might be necessary to 
    change data returned. Hook "after_data_request" could
    be used to inject custom dataformatter method.
    Below is presented an example method how data formatter
    might look like. In this example request return custom
    json object consisting of "count" and "results" parameters.
    When "count":0, then false is returned triggering cancellation
    of rendering of stratigraphy axis and removing stratigraphy
    axis from chart axis array. Data returned in "results"
    parameter is injected to this.data.
    */
    AxisStratigraphy.demoHook_DataFormatter = function() {
        var data = arguments[1];
        if("count" in data 
        && data.count < 1) {
            this.remove();
            for(var i=this.up.axes.length;i--;) {
                if(this.up.axes[i].constructor.name 
                == "AxisStratigraphy")
                    this.up.axes.splice(i, 1);
                this.doHooks("after_draw");
                return false;
            }
        }
        this.data = "results" in data ? data.results : data;
        return true;
    }

    /**
    
    */
    AxisStratigraphy.prototype.render = function() {
        var t = this, 
            maxLevel = 0;

        if(this.data == null) return;
            
        // Box
        this.dom.rects = this.dom.rects.data(this.data.filter(
            function(d){return 0 <= (t.scale(+d.depth_base) > t.scale(t.maxDepth) ? t.scale(t.maxDepth) : t.scale(+d.depth_base)) - 
                    (t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top)); }));      

        this.dom.rects.enter().append("rect")
            
        this.dom.rects
            .attr("x", function(d){
                if(+d.level > maxLevel) 
                    maxLevel = +d.level;
                return (+d.level-1) * t.cellWidth;
            })
            .attr("y", function(d){
                return t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top);
            })
            .attr("width", function(d){return t.cellWidth})
            .attr("height", function(d){
                //var top = (t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top)),
                //    bottom = (t.scale(+d.depth_base) > t.scale(t.maxDepth) ? t.scale(t.maxDepth) : t.scale(+d.depth_base));
                
                return (t.scale(+d.depth_base) > t.scale(t.maxDepth) ? t.scale(t.maxDepth) : t.scale(+d.depth_base)) - 
                    (t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top));
            })
            .attr("style", function(d){ 
                return t.styles["axis-stratigraphy-rect"]+
                    "fill:"+(d.color ? d.color.indexOf(",") !== -1 ? "rgb("+d.color+")" : d.color : "#fff")
            })
            .attr("class", "axis-stratigraphy-rect")

        this.dom.rects.exit().remove();

        this.width = maxLevel * this.cellWidth;

        // Text
        this.dom.texts = this.dom.texts.data(t.data.filter(
            function(d){return 0 <= (t.scale(+d.depth_base) > t.scale(t.maxDepth) ? t.scale(t.maxDepth) : t.scale(+d.depth_base)) - 
                    (t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top)); }));
        this.dom.texts.enter().append("text");
        this.dom.texts
            .attr("transform", function(d){ 
                return "translate("+
                            ((+d.level-1) * t.cellWidth+(t.cellWidth/2))+","+
                            (t.scale(+d.depth_base < t.maxDepth ? +d.depth_base : t.maxDepth)-2)+")"+
                        "rotate(-90)"; 
            })
            .attr("class", "axis-stratigraphy-text")
            .attr("style", this.styles["axis-stratigraphy-text"])
            .text(function(d) {return d.stratigraphy})
            .text(function(d, i){
                var top = t.scale(+d.depth_top) < 0 ? 0 : t.scale(+d.depth_top),
                    base = t.scale(+d.depth_base) > t.height ? t.height : t.scale(+d.depth_base);
            
                return (base-top) > this.getBBox().width ? d.stratigraphy : 
                    (base-top > 40) ? d.index_main : "";
            });
        this.dom.texts.exit().remove();
         
        // Depth mark
        var nest = d3.nest()
                     .key(function(d) {return d.depth_top})
                     .entries(t.data.filter(function(d){
                         return d.depth_top > t.minDepth && d.depth_top < t.maxDepth;
                     })),
            cellWidth = 0;
        this.dom.depths = this.dom.depths.data(nest);
        this.dom.depths.enter().append("text");
        this.dom.depths
            .attr("transform", function(d){
                return "translate("+(t.width+3)+","+(t.scale(+d.key)+3)+")"})
            .attr("class", "axis-stratigraphy-depthtext")
            .attr("style", this.styles["axis-stratigraphy-depthtext"])
            .text(function(d) {return d.key})
            .text(function(d){
                if(this.getBBox().width > cellWidth)
                    cellWidth = this.getBBox().width;
                return d.key;
            });
        this.dom.depths.exit().remove();

        this.width+=cellWidth;
    }

    /**
    
    */
    AxisStratigraphy.prototype.draw = function() {
        this.doHooks("before_draw");

        var mimeType=["csv","tsv","json","jsonp","text","xml"],
            cbfn = function(data) {
                var h = this.doHooks("after_data_request", data)||[];
                for(var i=h.length;i--;) if(!h[i]) return;
                
                if(data)
                    this.data = "results" in data ? data.results : data;               
                if(this.cols) 
                    this.colRenamer();
                this.dom.rects = this.dom.module
                    .selectAll(".axis-stratigraphy-rect");
                this.dom.texts = this.dom.module
                    .selectAll(".axis-stratigraphy-text");
                this.dom.depths = this.dom.module
                    .selectAll(".axis-stratigraphy-depthtext");
                this.render();

                this.doHooks("after_draw");
                this.up.redraw();
            };

        if(mimeType.indexOf(this.dataType) == -1) {
            console.error("Invalid data delimiter code given."+ 
                "Possible values: csv,tsv,json,jsonp,txt,xml");
            return;
        }

        this.doHooks("before_data_request");
        this.src ? d3[this.dataType](this.src, cbfn.bind(this)) : cbfn.bind(this);
    }

    /**

    */
    AxisStratigraphy.prototype.redraw = function() {
        this.render();
    }

    AxisStratigraphy.prototype.remove = function() { 
        this.dom.module
            .selectAll(".axis-stratigraphy-rect").remove();
        this.dom.module
            .selectAll(".axis-stratigraphy-text").remove();
        this.dom.module
            .selectAll(".axis-stratigraphy-depthtext").remove();
        for(var k in this.dom) {
            this.dom[k].remove();
            this.dom[k] = null;
        }
    }

    return AxisStratigraphy;
})(Flog2);
