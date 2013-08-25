function chartClickHandler() {
    var cv_chart = this.cv_chart;

    if(cv_chart.canDrillX(this.xAxisElement)){
	cv_chart.chartConfig.xRoot = this.xAxisElement.self.__cv_uri;
    }
    if(cv_chart.canDrillY(this.seriesElement)){
	cv_chart.chartConfig.yRoot = this.seriesElement.self.__cv_uri;
    }
    
    cv_chart.rerender();
};

/**
 * A grouped bar chart for rendering elements in groups
 */
class CubeViz_Visualization_HighCharts_GBar extends CubeViz_Visualization_HighCharts_Chart 
{
    //* the current chart configuration, may be changed from the original configuration.
    public chartConfig:any;
    //* predicate used for drilling
    public drillingPredicate:string;
    //* we are going to hack this class a bit, keeping the original configuration around is useful
    public originalConfiguration:any;
    //* the hierarchy information, holding the child elements for every parent uri
    public hierarchyTopDown:any;
    //* the hierarchy information, holding the parent element for every child uri
    public hierarchyBottomUp:any;
    //* the hierarchy controls craeted during post rendering process
    public hierarchyControls:any;
    //* the type of drilling used, can be both, x or y
    public drillType:string;
    //* the current Highcharts visualization that is being used. Remembered so the chart configuration has control over when to re-render the visualization
    public currentVisualization:any;
    //* top nodes of the hierarchy (x)
    public xTopNodes:any;
    //* top nodes of the hierarhcy (y)
    public yTopNodes:any;

    /**
     * Initialize a chart instance.
     * @param chartConfig Related chart configuration
     * @param retrievedObservations Array of retrieved observations 
     * @param selectedComponentDimensions Array of dimension objects with
     *                                    selected component dimensions.
     * @param multipleDimensions Array of dimension objects where at least two
     *                           dimension elements were selected.
     * @param oneElementDimensions Array of dimension objects where only one
     *                             dimension element was selected.
     * @param selectedMeasureUri Uri of selected measure
     * @param selectedAttributeUri Uri of selected attribute
     * @return void
     */
    public init (chartConfig:any, retrievedObservations:any[], 
        selectedComponentDimensions:any, multipleDimensions:any[],
        oneElementDimensions:any[], selectedMeasureUri:string,
        selectedAttributeUri:string) 
        : CubeViz_Visualization_HighCharts_Chart 
    {  
	this.originalConfiguration = {
	    chartConfig:chartConfig, retrievedObservations:retrievedObservations, 
            selectedComponentDimensions:selectedComponentDimensions, multipleDimensions:multipleDimensions,
            oneElementDimensions:oneElementDimensions, selectedMeasureUri:selectedMeasureUri,
            selectedAttributeUri:selectedAttributeUri
	};
	
	this.drillType = "both";

	this.drillingPredicate="http://www.w3.org/2004/02/skos/core#broader";
	
	this.updateConfiguration();

        return this;
    };

    public updateConfiguration () 
        : CubeViz_Visualization_HighCharts_Chart 
    {  
	var chartConfig:any = this.originalConfiguration.chartConfig;
	var retrievedObservations:any = this.originalConfiguration.retrievedObservations; 
        var selectedComponentDimensions:any = this.originalConfiguration.selectedComponentDimensions;
	var multipleDimensions:any = this.originalConfiguration.multipleDimensions;
	var oneElementDimensions:any = this.originalConfiguration.oneElementDimensions;
	var selectedMeasureUri:any = this.originalConfiguration.selectedMeasureUri;
	var selectedAttributeUri:any = this.originalConfiguration.selectedAttributeUri;

        var forXAxis = null,
            forSeries = null,
            observation = new DataCube_Observation (),
            self = this; 
        
        // save given chart config
        this.chartConfig = chartConfig;
        
        /**
         * Empty array's we want to fill later
         */
        this.chartConfig.series = [];
        
        if(true === _.isUndefined(self.chartConfig.xAxis)){
            this.chartConfig.xAxis = {categories: []};
        } else {
            this.chartConfig.xAxis.categories = [];
        }
        
        // set empty chart title
        this.chartConfig.title.text = "";
        
        // x axis: set default, if unset
        if (true === _.isUndefined(this.chartConfig.xAxis)) {
            this.chartConfig.xAxis = {
                title: {
                    text: ""
                }
            };
        }
        
        // y axis: set default, if unset
        if (true === _.isUndefined(this.chartConfig.yAxis)) {
            this.chartConfig.yAxis = {
                title: {
                    text: ""
                }
            };
        }

        // assign selected dimensions to xAxis and series (yAxis)
        _.each(selectedComponentDimensions, function(selectedDimension){
            
            // ignore dimensions which have no elements
            if ( 2 > _.keys(selectedDimension.__cv_elements).length) {
                return;
            }

            if ( null == forXAxis ) {
                forXAxis = selectedDimension["http://purl.org/linked-data/cube#dimension"];
            } else {
                forSeries = selectedDimension["http://purl.org/linked-data/cube#dimension"];
            }
        });
        
        // in the loop before, only multiple element dimensions were used
        // in the case that forSeries is still null, use the first one element
        // dimension instead
        if (null == forSeries) {
            _.each(selectedComponentDimensions, function(selectedDimension) {
                if (1 == _.keys(selectedDimension.__cv_elements).length
                    && null == forSeries)
                    forSeries = selectedDimension["http://purl.org/linked-data/cube#dimension"];
            });
        }
        
        // If set, switch axes
        this.chartConfig._cubeVizVisz = this.chartConfig._cubeVizVisz || {};
        if ( "true" == this.chartConfig._cubeVizVisz.doSwitchingAxes) {
            var tmp = forXAxis;
            forXAxis = forSeries;
            forSeries = tmp;
        }
        
        // initializing observation handling instance with given elements
        // after init, sorting the x axis elements ascending
        observation.initialize(retrievedObservations, selectedComponentDimensions, selectedMeasureUri);

	self.clearHierarchy();
	self.xTopNodes = self.loadHierarchy(observation.getAxesElements(forXAxis));
	self.yTopNodes = self.loadHierarchy(observation.getAxesElements(forSeries));
        
        /**
         * Check if there are exactly one or two multiple dimensions
         * If both forXAxis and forSeries strings are not blank, than you have 
         * two multiple dimensions
         */
        if (false === _.str.isBlank(forXAxis) && false === _.str.isBlank(forSeries)) {
	    self.handleTwoDimensions(observation, forXAxis, selectedComponentDimensions, forSeries, selectedAttributeUri, selectedMeasureUri);
        // You have one or zero multiple dimensions
        } else if (false === _.str.isBlank(forXAxis) || false === _.str.isBlank(forSeries)) {

            /**
             * Something like the following example will be generated:
             * 
             *  xAxis: {
             *      categories: ["foo", "bar"]
             *  }
             * 
             *  series: [{
             *      name: ".",
             *      data: [10, 20]
             *  }]
             */
            if (false === _.str.isBlank(forXAxis)) {
               
                var seriesObservation:Object = null,
                    seriesDataList:number[] = [],
                    xAxisElements:any = observation.getAxesElements(forXAxis),
                    value:number = 0;
                    
                _.each(xAxisElements, function(xAxisElement){
                    
                    seriesObservation = xAxisElement.observations[_.keys(xAxisElement.observations)[0]];
                    
                    // check if the current observation has to be ignored
                    // it will ignored, if attribute uri is set, but the observation
                    // has no value of it
                    if (false === _.isNull(selectedAttributeUri)
                        && 
                        ( true === _.isNull(seriesObservation [selectedAttributeUri])
                          || true === _.isUndefined(seriesObservation [selectedAttributeUri]))) {
                        // TODO implement a way to handle ignored observations
                        return;
                    }
                    
                    // add entry on the y axis
                    self.chartConfig.xAxis.categories.push(
                        self.fetchLabel(xAxisElement)
                    );
                    
                    // save related value
                    seriesDataList.push(
                        seriesObservation [selectedMeasureUri]
                    );
                });
                
                // set series element
                this.chartConfig.series = [{
                    name: ".",
                    data: seriesDataList
                }];
               
            /**
             * Something like the following example will be generated:
             * 
             *  xAxis: {
             *      categories: ["."]
             *  }
             * 
             *  series: [{
             *      name: "foo",
             *      data: [10]
             *  },{
             *      name: "bar",
             *      data: [20]
             *  }]
             */
            } else {
                
                var seriesObservation:Object = null,
                    seriesDataList:number[] = [],
                    seriesElements:any = observation.getAxesElements(forSeries),
                    value:number = 0;
                    
                // set xAxis categories
                this.chartConfig.xAxis.categories = ["."];
                    
                // set series elements
                _.each(seriesElements, function(seriesElement){

                    seriesObservation = seriesElement.observations[_.keys(seriesElement.observations)[0]];
                    
                    // check if the current observation has to be ignored
                    // it will ignored, if attribute uri is set, but the observation
                    // has no value of it
                    if (false === _.isNull(selectedAttributeUri)
                        && 
                        ( true === _.isNull(seriesObservation [selectedAttributeUri])
                          || true === _.isUndefined(seriesObservation [selectedAttributeUri]))) {
                        // TODO implement a way to handle ignored observations
                        return;
                    }
                    
                    // add entry on the y axis
                    self.chartConfig.series.push({
                        name: self.fetchLabel(seriesElement),
                        data: [seriesObservation[selectedMeasureUri]]
                    });
                });
            }
        }

	self.chartConfig.plotOptions[self.chartConfig.chart.type] = { point : { events : {click : chartClickHandler}}};

	self.configureAxes();
        
        return this;
    };

    //* provides all configuration settings for the axes.
    public configureAxes() : void {
	this.chartConfig.xAxis.labels={useHTML:true};
	this.chartConfig.yAxis.labels={useHTML:true};
    };

    //* whether or not the given element should be hidden
    public shouldHideElement(element:any, seriesElement:bool) :bool {
	var reference = null;
	if(seriesElement){
	    reference = this.chartConfig.yRoot
	}else{
	    reference = this.chartConfig.xRoot
	}

	var drillValue = element.self[this.drillingPredicate];
	if(!drillValue || typeof drillValue == "string"){
	    return reference != drillValue;
	}else{
	    for(var prop in drillValue){
		if(reference == drillValue[prop]){
		    return false;
		}
	    }
	    return true;
	}
    };

    //* clears the current hierarchy, making sure the maps are completely empty
    public clearHierarchy() : void {
	this.hierarchyTopDown = {};
	this.hierarchyBottomUp = {};
    }; 

   /**
    * loads the hierarchy information contained in the list of elements in the hierarchy elements. 
    * returns the roots of the hierarchy. 
    */
    public loadHierarchy(elements:any) : any {
	var self:any = this;
	var roots = [];
        _.each(elements, function(element){
	    var parent = element.self[self.drillingPredicate];
	    var elementUri = element.self.__cv_uri;
	    if(parent && typeof parent == "string"){
		self.hierarchyBottomUp[elementUri]=elements[parent];
		if(!self.hierarchyTopDown[parent]){
		    self.hierarchyTopDown[parent] = {};
		}
		// want to have a set of elements, not a list with duplicates. This is the easiest way to check that
		self.hierarchyTopDown[parent][elementUri] = element;
	    }else if(parent){
		for(var prop in parent){
		    var singleParent = parent[prop];
		    self.hierarchyBottomUp[elementUri]=elements[singleParent];
		    if(!self.hierarchyTopDown[singleParent]){
			self.hierarchyTopDown[singleParent] = {};
		    }
		    self.hierarchyTopDown[singleParent][elementUri] = element;
		}
	    }else{
		roots.push(elementUri);
	    }
	});

	return roots;
    };

    //* returns the children of the given element in the hierarchy
    public getChildren(element:any) : any[] {
	if(!element){
	    return [];
	}

	var list = [];
	var children = this.hierarchyTopDown[element.self.__cv_uri];
	if(!children){
	    children = {};
	}
	_.each(children, function(child){
	    list.push(child);
	});
	return list;
    };
    
    //* returns the parent in the hierarchy of elements if any
    public getParent(element:any) : any {
	return this.getParentByUri(element?element.self.__cv_uri:element);
    };
    
    //* uses the uri of the element to look up its parent
    public getParentByUri(elementUri:string) : any {
	if(!elementUri){
	    return null;
	}
	return this.hierarchyBottomUp[elementUri];
    };

    //* fetches the correct label for the given component element. Uses html to represent the label!
    public fetchLabel(element:any) : string {
	var s = "<div>"+element.self.__cv_niceLabel+"</div>";
	var current = element;
	var parent;
	while (parent = this.getParent(current)){
	    s = "<div>"+parent.self.__cv_niceLabel+" &gt; </div>" + s;
	    current = parent;
	}
	return s;
    };

    public handleTwoDimensions(observation:any, forXAxis:any, selectedComponentDimensions:any, forSeries:any, selectedAttributeUri:any, selectedMeasureUri:any) : void {
        var xAxisElements:any = observation.getAxesElements(forXAxis);
	var self:any = this;
        
        // put labels for properties to the axis
        _.each(xAxisElements, function(xAxisElement){
	    if(self.shouldHideElement(xAxisElement,false)){
		return;
	    }
            self.chartConfig.xAxis.categories.push(self.fetchLabel(xAxisElement));
        });
        
        /**
         * collect URI's of selected dimensions
         */
        var selectedDimensionPropertyUris:string[] = [];
        
        _.each(selectedComponentDimensions, function(dimension){
            selectedDimensionPropertyUris.push(dimension["http://purl.org/linked-data/cube#dimension"]); 
        });
        
        /**
         * now we take care about the series
         */
        var obj:any = {},
        seriesElements:any = observation.getAxesElements(forSeries),
        uriCombination:string = "",
        usedDimensionElementCombinations:any = {};
        
        self.chartConfig.series = [];

        _.each(seriesElements, function(seriesElement){
            // this represents one item of the series array (of highcharts)
            obj = { 
                color: CubeViz_Visualization_Controller.getColor(
                    seriesElement.self.__cv_uri
                ),
                data: [],
                name: self.fetchLabel(seriesElement)
            };

	    if(self.shouldHideElement(seriesElement,true)){
		return;
	    }
            
            // go through all observations associated with this seriesElement
            // and add their values (measure) if set
            _.each(seriesElement.observations, function(seriesObservation){
                
                // check if the current observation has to be ignored
                // it will ignored, 
                //      if attribute uri is set, but the observation
                //      has no value of it
                // and
                //      if the predicate which is labeled with DataCube's 
                //      attribute is not equal to the given selected attribute uri
		var xAxisElement = xAxisElements[seriesObservation[forXAxis]];
                if (self.shouldHideElement(xAxisElement, false))
                {
                    // TODO implement a way to handle ignored observations
                    return;
                }
                
                /**
                 * check if the combination of dimension elements in this series 
                 * element was already used.
                 */
                uriCombination = "";
                
                _.each(selectedDimensionPropertyUris, function(dimensionUri){
                    uriCombination += seriesObservation[dimensionUri];
                });
                
                if (true === _.isUndefined(usedDimensionElementCombinations[uriCombination])) {
                    usedDimensionElementCombinations[uriCombination] = true;
                } else {
                    // if this combination is already in use, stop execution immediatly
                    return;
                }                
                
                if(false === _.isUndefined(seriesObservation[selectedMeasureUri])) {
                    obj.data.push ({y:parseFloat(seriesObservation[selectedMeasureUri]),
				    cv_chart: self,
				    xAxisElement: xAxisElement,
				    seriesElement: seriesElement});
                } else {
                    obj.data.push (null);
                }
            });
            
            // if nothing was added, ignore obj
            if (0 == _.size(obj.data)) {
                // TODO handle ignore obj's
            } else {
                self.chartConfig.series.push (obj);
            }
        });
    };

    public rerender() : void {
	var visualization = this.currentVisualization;
	while(visualization.series[0]){
	    visualization.series[0].remove(false);
	}

	this.updateConfiguration();
	
	for(var series in this.chartConfig.series){
	    visualization.addSeries(this.chartConfig.series[series],false);
	}

	visualization.xAxis[0].setCategories(this.chartConfig.xAxis.categories);
	
	visualization.redraw();
    };

    //* abstract function, called when visual rendering has completed. Allows the chart to handle any post processing steps, also keeps the visualization around for further processing
    public rendered (visualization:any) : void {
	this.currentVisualization = visualization;
	if(this.hierarchyControls){
	    return;
	}
	//* create the hierarchy controls
	$("#cubeviz-index-legend").before('<div class="hierarchyControls">'+
					  '<div><strong class="hierarchy-drill-by"> Drill by </strong>'+
					  '<form>'+
					   '<input type="radio" name="drilling" value="x"><span>x-axis</span>' +
					   '<input type="radio" name="drilling" value="y"><span>y-axis</span>' +
					   '<input type="radio" name="drilling" value="both" checked=true><span>both axes</span>' +
					  '</form></div><button type="button">Move Up</button></div>');
	this.hierarchyControls = $("#cubeviz-index-legend").prev()[0];
	var button = this.hierarchyControls.children[1];
	var form = this.hierarchyControls.children[0].children[1];
	var self = this;
	$(button).click(function(){
	    self.moveUp();
	});
	$(form).find("input").change(function(){
	    self.drillType = $(this).val();
	});	
    };

    //* moves up in the hierarchy, depending on the setting of the drillType
    public moveUp() : any {
	if(this.canRollUpX()){
	    var parentX=this.getParentByUri(this.chartConfig.xRoot);
	    this.chartConfig.xRoot = parentX?parentX.self.__cv_uri:null;
	}
	if(this.canRollUpY()){
	    var parentY=this.getParentByUri(this.chartConfig.yRoot);
	    this.chartConfig.yRoot = parentY?parentY.self.__cv_uri:null;
	}

	this.rerender();

	return this;
    };

    public onDestroy() : void {
	$(this.hierarchyControls).remove();
    };

    public getCurrentXRoot() : any {
	return this.chartConfig.xRoot;
    };

    public getCurrentYRoot() : any {
	return this.chartConfig.yRoot;
    };

    public canDrillX(targetX) : bool {
	return this.getChildren(targetX).length>0 && 
	    (this.drillType == "both" || this.drillType == "x");
    };

    public canDrillY(targetY) : bool {
	return this.getChildren(targetY).length>0 && 
	    (this.drillType == "both" || this.drillType == "y");
    };

    public canRollUpX() : bool {
	return (this.drillType == "both" || this.drillType == "x");
    };

    public canRollUpY() : bool {
	return (this.drillType == "both" || this.drillType == "y");
    };

}
