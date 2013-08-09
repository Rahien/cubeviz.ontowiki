function chartClickHandler() {
    var chart = this.series.chart;
    var cv_chart = this.cv_chart;

    cv_chart.chartConfig.observationRoot = this.xAxisElement.self.__cv_uri;
    cv_chart.chartConfig.seriesRoot = this.seriesElement.self.__cv_uri;
    while(chart.series[0]){
	chart.series[0].remove(false);
    }

    cv_chart.updateConfiguration();
    
    for(var series in cv_chart.chartConfig.series){
	chart.addSeries(cv_chart.chartConfig.series[series],false);
    }

    chart.xAxis[0].setCategories(cv_chart.chartConfig.xAxis.categories);
    
    chart.redraw();
};

/**
 * A grouped bar chart for rendering elements in groups
 */
class CubeViz_Visualization_HighCharts_GBar extends CubeViz_Visualization_HighCharts_Chart 
{
    public chartConfig:any;
    //* predicate used for drilling
    public drillingPredicate:string;

    //* we are going to hack this class a bit
    public originalConfiguration:any;
    
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
                        xAxisElement.self.__cv_niceLabel
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
                        name: seriesElement.self.__cv_niceLabel,
                        data: [seriesObservation[selectedMeasureUri]]
                    });
                });
            }
        }

	self.chartConfig.plotOptions[self.chartConfig.chart.type] = { point : { events : {click : chartClickHandler}}};
        
        return this;
    };

    //* whether or not the given element should be hidden
    public shouldHideElement(element:any, seriesElement:bool) :bool {
	var reference = null;
	if(seriesElement){
	    reference = this.chartConfig.seriesRoot
	}else{
	    reference = this.chartConfig.observationRoot
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

    public handleTwoDimensions(observation:any, forXAxis:any, selectedComponentDimensions:any, forSeries:any, selectedAttributeUri:any, selectedMeasureUri:any) : void {
        var xAxisElements:any = observation.getAxesElements(forXAxis);
	var self:any = this;
        
        // put labels for properties to the axis
        _.each(xAxisElements, function(xAxisElement){
	    if(self.shouldHideElement(xAxisElement,false)){
		return;
	    }
            self.chartConfig.xAxis.categories.push(xAxisElement.self.__cv_niceLabel);
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
                name: seriesElement.self.__cv_niceLabel
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
}
