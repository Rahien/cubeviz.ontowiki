function chartClickHandler() {
    var cv_chart = this.series.chart._cubeviz_configuration;
    
    var xtarget = cv_chart.getDrillTarget(this.xAxisElement,true);
    var ytarget = cv_chart.getDrillTarget(this.seriesElement,false);

    if(cv_chart.canDrillX(xtarget)){
	cv_chart.chartConfig.xRoot = xtarget;
    }
    if(cv_chart.canDrillY(ytarget)){
	cv_chart.chartConfig.yRoot = ytarget;
    }
    cv_chart.resetLevels();

    cv_chart.rerender();
};

/**
 * A grouped bar chart for rendering elements in groups
 */
class CubeViz_Visualization_HighCharts_Hierarchic extends CubeViz_Visualization_HighCharts_Chart 
{
    //* the current chart configuration, may be changed from the original configuration.
    public chartConfig:any;
    //* we are going to hack this class a bit, keeping the original configuration around is useful
    public originalConfiguration:any;
    //* the hierarchy controls craeted during post rendering process
    public hierarchyControls:any;
    //* the type of drilling used, can be both, x or y
    public drillType:string;
    //* the levels that should be shown when the drilling mode is set to 'by level', has the form {x:int, y:int}
    public levels:any;
    //* cache of the current elements on the currently selected level of this object
    public levelElements:any;
    //* the current Highcharts visualization that is being used. Remembered so the chart configuration has control over when to re-render the visualization
    public currentVisualization:any;
    //* the hierarchy for this visualization's X dimension
    public hierarchyX:any;
    //* the hierarchy for this visualization's Y dimension
    public hierarchyY:any;
    //* whether or not the chart should only show the bottom elements. This value has precedence over all other properties influencing the hierarchy (like top nodes)
    public bottomOnly:bool;

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
        oneElementDimensions:any[], selectedMeasure:string,
        selectedAttributeUri:string) 
        : CubeViz_Visualization_HighCharts_Chart 
    {  
	this.originalConfiguration = {
	    chartConfig:chartConfig, retrievedObservations:retrievedObservations, 
            selectedComponentDimensions:selectedComponentDimensions, multipleDimensions:multipleDimensions,
            oneElementDimensions:oneElementDimensions, selectedMeasure:selectedMeasure,
            selectedAttributeUri:selectedAttributeUri
	};

	this.hierarchyX = new DataCube_Hierarchy (chartConfig.hierarchyPredicate);
	this.hierarchyY = new DataCube_Hierarchy (chartConfig.hierarchyPredicate);
	this.bottomOnly = false;
	this.drillType = "both";

	this.resetLevels();
	
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
	var selectedMeasure:any = this.originalConfiguration.selectedMeasure;
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
	var selectedMeasureUri =  selectedMeasure["http://purl.org/linked-data/cube#measure"];
        observation.initialize(retrievedObservations, selectedComponentDimensions,selectedMeasureUri);

	self.hierarchyX.clear();
	self.hierarchyY.clear();
	self.hierarchyX.load(observation.getAxesElements(forXAxis),"x");
	self.hierarchyY.load(observation.getAxesElements(forSeries), "y");
        
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

    //* returns the elements that should be shown on the current level, elements are fetched lazily and should be invalidated upon level change
    public getElementsOnCurrentLevel() : any {
	if(!this.levelElements){
	    this.levelElements={};
	    this.levelElements.x=this.hierarchyX.getElementsOnLevel(this.chartConfig.xRoot,Math.max(this.levels.x,1));
	    this.levelElements.y=this.hierarchyY.getElementsOnLevel(this.chartConfig.yRoot,Math.max(this.levels.y,1));
	}
	return this.levelElements;
    };

    public invalidateLevelCache() : any {
	this.levelElements=null;	
    };

    //* whether or not the given element should be hidden
    public shouldHideElement(element:any, seriesElement:bool) :bool {
	var hierarchy = seriesElement?this.hierarchyY:this.hierarchyX;
	if(this.bottomOnly){
	    return !element || hierarchy.getChildren(element).length !=  0;
	}

	var reference = null;
	if(seriesElement){
	    reference = this.getElementUri(this.chartConfig.yRoot);
	}else{
	    reference = this.getElementUri(this.chartConfig.xRoot);
	}

	var targets = this.getElementsOnCurrentLevel()[seriesElement?"y":"x"];
	for(var i=0, target; target= targets[i]; i++){
	    if(target == element){
		return false;
	    }
	}
	return true;
    };

    //* fetches the correct label for the given component element. Uses html to represent the label!
    public fetchLabel(element:any) : string {
	return this.hierarchyX.htmlElementLabel(element) || this.hierarchyY.htmlElementLabel(element) || "<div>"+(element.self || element).__cv_niceLabel+"</div>";
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
				    //cv_chart: self,
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

	this.updatePositionLabels();
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
					  '<select><option value="x">x-axis</option><option value="y">y-axis</option><option value="both" selected=true>both</option></select>' +
					  '</div><div><strong class="hc-title">Other controls</strong><button type="button">Move Up</button>'+
					  '<span class="toggleBottomLevels"><span>Show all bottom levels</span><input type="checkbox"></span></div>' +
					  '<div class="hc-position"><strong class="hc-title">Position in hierarchy</strong>'+
					  '<div><span>x-root:</span><span>unknown</span><span>level:</span><button>-</button><span>unknown</span><button>+</button></div>'+
					  '<div><span>y-root:</span><span>unknown</span><span>level:</span><button>-</button><span>unknown</span><button>+</button></div></div>'+
					  '</div>');
	this.hierarchyControls = $("#cubeviz-index-legend").prev()[0];
	var button = this.hierarchyControls.children[1].children[1];
	var checkbox = this.hierarchyControls.children[1].children[2].children[1];
	var selectType = this.hierarchyControls.children[0].children[1];

	var xDiv = this.hierarchyControls.children[2].children[1];
	var yDiv = this.hierarchyControls.children[2].children[2];

	var levelXDown = xDiv.children[3];
	var levelXUp = xDiv.children[5];
	var levelYDown = yDiv.children[3];
	var levelYUp = yDiv.children[5];
	    
	var self = this;
	$(button).click(function(){
	    self.moveUp();
	});
	$(levelXDown).click(function(){
	    self.decreaseLevelX();
	    self.rerender();
	});
	$(levelYDown).click(function(){
	    self.decreaseLevelY();
	    self.rerender();
	});
	$(levelXUp).click(function(){
	    self.increaseLevelX();
	    self.rerender();
	});
	$(levelYUp).click(function(){
	    self.increaseLevelY();
	    self.rerender();
	});
	$(selectType).change(function(){
	    self.drillType = $(this).val();
	});

	$(checkbox).change(function(){
	    if(this.checked){
		self.setBottomOnly(true);
	    }else{
		self.setBottomOnly(false);
	    } 
	});
	this.updatePositionLabels();
    };
    
    //* updates the position labels in the html so the user can 
    public updatePositionLabels() : void {
	var xDiv = this.hierarchyControls.children[2].children[1];
	var yDiv = this.hierarchyControls.children[2].children[2];
	
	$(xDiv.children[1]).text(this.chartConfig.xRoot?this.hierarchyX.stringElementLabel(this.chartConfig.xRoot):"top");
	$(xDiv.children[4]).text(this.levels.x);

	$(yDiv.children[1]).text(this.chartConfig.yRoot?this.hierarchyY.stringElementLabel(this.chartConfig.yRoot):"top");
	$(yDiv.children[4]).text(this.levels.y);
    };

    //* moves up in the hierarchy, depending on the setting of the drillType
    public moveUp() : any {
	if(this.canRollUpX()){
	    var parentX=this.hierarchyX.getParent(this.chartConfig.xRoot);
	    this.chartConfig.xRoot = parentX?parentX:null;
	}
	if(this.canRollUpY()){
	    var parentY=this.hierarchyY.getParent(this.chartConfig.yRoot);
	    this.chartConfig.yRoot = parentY?parentY:null;
	}
	this.resetLevels();

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
	return this.hierarchyX.getChildren(targetX).length>0 && 
	    (this.drillType == "both" || this.drillType == "x");
    };

    public canDrillY(targetY) : bool {
	return this.hierarchyY.getChildren(targetY).length>0 && 
	    (this.drillType == "both" || this.drillType == "y");
    };

    public canRollUpX() : bool {
	return (this.drillType == "both" || this.drillType == "x");
    };

    public canRollUpY() : bool {
	return (this.drillType == "both" || this.drillType == "y");
    };

    public setBottomOnly(value:bool) : void {
	this.bottomOnly = value;
	this.invalidateLevelCache();
	this.rerender();
    }

    public resetLevels():any {
	this.invalidateLevelCache();
	this.levels = {x:1, y:1};
    }

    public increaseLevelX() :void {
	if(this.hierarchyX.getElementsOnLevel(this.chartConfig.xRoot, Math.max(this.levels.x + 1, 1)).length > 0) {
	    this.levels.x=this.levels.x+1;
	}
	this.invalidateLevelCache();
    }

    public increaseLevelY() :void {
	if(this.hierarchyY.getElementsOnLevel(this.chartConfig.yRoot, Math.max(this.levels.y + 1, 1)).length > 0) {
	    this.levels.y=this.levels.y+1;
	}
	this.invalidateLevelCache();
    }

    public decreaseLevelX() :void {
	this.levels.x=Math.max(1,this.levels.x-1);
	this.invalidateLevelCache();
    }

    public decreaseLevelY() :void {
	this.levels.y=Math.max(1,this.levels.y-1);
	this.invalidateLevelCache();
    }

    public getElementUri(element:any) : any {
	return element?element.self.__cv_uri:element;
    }

    //* returns the new element that should be selected after the user clicks on an element in the graphical interface. Takes levels into account
    public getDrillTarget(element:any,xdim:bool) : any {
	var hierarchy = null;
	var levels = 0;
	if(xdim){
	    hierarchy=this.hierarchyX;
	    levels=this.levels.x;
	}else{
	    hierarchy=this.hierarchyY;
	    levels=this.levels.y;
	}
	while(levels>1){
	    element=hierarchy.getParent(element);
	    levels--;
	}
	return element;
    }

    //* abstract static function that allows to change the configuration based on the current data, note: not actually inherited. here for documentation purposes. Function is optional.
    static updateConfigByData(config:any, data:any):any{
	var hierClass = CubeViz_Visualization_HighCharts_Hierarchic;
	var configClone = hierClass.deepClone(config)
	var observationPredicates = DataCube_Hierarchy.getAllDimensionValuePredicates(data);
	
	// remove options not present in data
	for( var i=0, option; option=configClone.options[i]; i++){
	    if(option.key == "hierarchyPredicate"){
		for(var j=0, value; value=option.values[j]; j++){
		    if(!observationPredicates[value.value]){
			configClone.options[i].values.splice(j,1);
			j--;
		    }
		}
	    }
	}
	//void
	return configClone;
    }

    //* takes deep clone of object
    static deepClone(data:any) :any{
	var deepClone = CubeViz_Visualization_HighCharts_Hierarchic.deepClone;
	if(_.isObject(data)){
	    var newObject:any;
	    if(_.isArray(data)){
		newObject = [];
		for(var i=0, part; part=data[i]; i++){
		    newObject.push(deepClone(part));
		}
		return newObject;
	    }else{
		newObject = {};
		for(var prop in data){
		    newObject[prop] = deepClone(data[prop]);
		}
		return newObject;
	    }
	}else{
	    return data;
	}
    }
}
