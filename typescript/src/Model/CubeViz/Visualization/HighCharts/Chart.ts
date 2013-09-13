/**
 * 
 */
class CubeViz_Visualization_HighCharts_Chart 
{
    public chartConfig:any;
    
    /**
     *
     */
    public handleTwoDimensionsWithAtLeastOneDimensionElement(selectedComponentDimensions:any,
        forXAxis:string, forSeries:string, selectedAttributeUri:string, 
        selectedMeasureUri:string, observation:DataCube_Observation ) : void 
    {
        var categoriesElementAssign = {},
            i:number = 0,
            self = this,
            xAxisElements:any = observation.getAxesElements(forXAxis);
        
        /**
         * put labels for properties to the axis (categories)
         */
        _.each(xAxisElements, function(xAxisElement){
            self.chartConfig.xAxis.categories.push(xAxisElement.self.__cv_niceLabel);
            categoriesElementAssign [xAxisElement.self.__cv_uri] = i++;
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
            usedDimensionElementCombinations:any = {},
            valueToUse:string = null;
            
        self.chartConfig.series = [];

        _.each(seriesElements, function(seriesElement){
            
            // this represents one item of the series array (of highcharts)
            obj = { 
                color: CubeViz_Visualization_Controller.getColor(
                    seriesElement.self.__cv_uri
                ),
                data: [],
                name: seriesElement.self.__cv_niceLabel,
                __cv_uri: seriesElement.self.__cv_uri
            };
            
            // fill data properties with as many null values as categories are
            for (i = 0; i < _.size(self.chartConfig.xAxis.categories); ++i) {
                obj.data.push (null);
            }
            
            // go through all observations associated with this seriesElement
            // and add their values (measure) if set
            _.each(seriesElement.observations, function(seriesObservation){
                
                if (false === DataCube_Observation.isActive(seriesObservation)){
                    return;
                }
                
                // check if the current observation has to be ignored:
                // it will ignored, 
                //      if attribute uri is set, but the observation
                //      has no value of it
                // and
                //      if the predicate which is labeled with DataCube's 
                //      attribute is not equal to the given selected attribute uri
                if ((   false === _.isNull(selectedAttributeUri)
                        && 
                        ( true === _.isNull(seriesObservation [selectedAttributeUri])
                          || true === _.isUndefined(seriesObservation [selectedAttributeUri])))
                    && 
                        selectedAttributeUri !== seriesObservation ["http://purl.org/linked-data/cube#attribute"]) {
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
                
                // set observation value, distinguish between original and user-set
                // one: prefer the user-set one over the original
                if (false === _.isUndefined(seriesObservation.__cv_temporaryNewValue)) {
                    valueToUse = seriesObservation.__cv_temporaryNewValue;
                } else {
                    valueToUse = seriesObservation[selectedMeasureUri];
                }
                    
                /**
                 * check if measure value is set, if not add null
                 */
                if(false === _.isUndefined(seriesObservation[selectedMeasureUri])) {                        
                    obj.data [categoriesElementAssign[seriesObservation[forXAxis]]] = parseFloat(
                        valueToUse
                    );
                } else {
                    obj.data [categoriesElementAssign[seriesObservation[forXAxis]]] = null;
                }
            });
            
            // if nothing was added, ignore obj
            if (0 == _.size(obj.data)) {
                // TODO handle ignore obj's
            } else {
                self.chartConfig.series.push (obj);
            }
        });
    }
    
    /**
     *
     */
    public handleOnlyOneElementDimension(forSeries:string, selectedAttributeUri:string, 
        selectedMeasureUri:string, observation:DataCube_Observation ) : void
    {
        var self = this,
            seriesObservation:any = null,
            seriesDataList:number[] = [],
            seriesElements:any = observation.getAxesElements(forSeries),
            valueToUse:string = null;
            
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
            
            // set observation value, distinguish between original and user-set
            // one: prefer the user-set one over the original
            if (false === _.isUndefined(seriesObservation.__cv_temporaryNewValue)) {
                valueToUse = seriesObservation.__cv_temporaryNewValue;
            } else {
                valueToUse = seriesObservation[selectedMeasureUri];
            }
            
            // add entry on the y axis
            self.chartConfig.series.push({
                name: seriesElement.self.__cv_niceLabel,
                data: [valueToUse]
            });
        });
    }
    
    /**
     * Only one dimension which is multiple:
     * 
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
    public handleOnlyOneMultipleDimension(forXAxis:string, selectedAttributeUri:string, 
        selectedMeasureUri:string, observationObj:DataCube_Observation,
        oneElementDimensions:any[] ) : void
    {
        var self = this,
            observation:any = null,
            seriesDataList:number[] = [],
            xAxisElements:any = observationObj.sortAxis(forXAxis, "ascending")
                                              .getAxesElements(forXAxis),
            value:any = null;
        
        _.each(xAxisElements, function(xAxisElement){
            
            _.each (xAxisElement.observations, function(observation){
            
                if (false === DataCube_Observation.isActive(observation)) {
                    return;
                }
                
                value = DataCube_Observation.parseValue(
                    observation, selectedMeasureUri
                );
                
                if (true === _.isNull(value)) {
                    return
                }
                
                // check if the current observation has to be ignored
                // it will ignored, if attribute uri is set, but the observation
                // has no value of it
                if (false === _.isNull(selectedAttributeUri)
                    && 
                    ( true === _.isNull(observation [selectedAttributeUri])
                      || true === _.isUndefined(observation [selectedAttributeUri]))) {
                    // TODO implement a way to handle ignored observations
                    return;
                }
                
                // add entry on the y axis
                self.chartConfig.xAxis.categories.push(
                    xAxisElement.self.__cv_niceLabel
                );
                
                // save related value
                seriesDataList.push(value);
            });
        });
        
        // set series element
        var seriesName = ".";
        
        if (0 < _.size(oneElementDimensions)) {
            var dimensionElementLabels:string[] = [];
        
            _.each (oneElementDimensions, function(dimension){
                dimensionElementLabels.push (dimension.__cv_elements[0].__cv_niceLabel);
            });
            
            seriesName = dimensionElementLabels.join (" - ");
        } 
        
        this.chartConfig.series = [{
            name: seriesName,
            data: seriesDataList
        }];
    }
    
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
     * @return CubeViz_Visualization_HighCharts_Chart
     */
    public init (chartConfig:any, retrievedObservations:any[], 
        selectedComponentDimensions:any, multipleDimensions:any[],
        oneElementDimensions:any[], selectedMeasure:any,
        selectedAttributeUri:string) 
        : CubeViz_Visualization_HighCharts_Chart 
    {  
        var diff:number = 0,
            forXAxis = null,
            forSeries = null,
            i:number = 0,
            observation:DataCube_Observation = new DataCube_Observation (),
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
        observation.initialize(
            retrievedObservations, 
            selectedComponentDimensions, 
            selectedMeasure["http://purl.org/linked-data/cube#measure"]
        );

        /**
         * Check if there are two dimensions with at least two dimension elements.
         * If both forXAxis and forSeries strings are not blank, than you have 
         * two multiple dimensions
         */
        if (false === _.str.isBlank(forXAxis) && false === _.str.isBlank(forSeries)
            && 1 < _.size(multipleDimensions)) {
                
            this.handleTwoDimensionsWithAtLeastOneDimensionElement(
                selectedComponentDimensions, 
                forXAxis,
                forSeries,
                selectedAttributeUri,
                selectedMeasure["http://purl.org/linked-data/cube#measure"],
                observation
            );
        
        // You have one or zero multiple dimensions
        } else if (false === _.str.isBlank(forXAxis) || false === _.str.isBlank(forSeries)) {

            /**
             * Only one dimension which is multiple:
             * 
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
               
                this.handleOnlyOneMultipleDimension(
                    forXAxis, 
                    selectedAttributeUri, 
                    selectedMeasure["http://purl.org/linked-data/cube#measure"], 
                    observation,
                    oneElementDimensions
                );
               
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
                
                this.handleOnlyOneElementDimension (
                    forSeries, 
                    selectedAttributeUri, 
                    selectedMeasure["http://purl.org/linked-data/cube#measure"], 
                    observation
                );
            }
        }
        
        // initialize tooltip
        this.setTooltip(
            // first selected dimension
            selectedComponentDimensions[
                Object.keys(selectedComponentDimensions)[0]
            ],
            // selected measure object
            selectedMeasure
        );
        
        return this;
    };
    
    /**
     * Simply returns the adapted chartConfig.
     * @return any Object to configure HighCharts instance.
     */
    public getRenderResult () : any 
    {       
        return this.chartConfig;
    }
    
    /**
     * Initializes the tooltip functionality of HighCharts
     * @param selectedMeasure any Selected measure object
     * @return void
     */
    public setTooltip(xAxisDimension:any, selectedMeasure:any) : void
    {
        var self = this;
        
        this.chartConfig.tooltip = {
            
            /**
             * HighCharts API Description of formatter function:
             * http://api.highcharts.com/highcharts#tooltip.formatter
             */
            formatter: function() {
                
                return xAxisDimension.__cv_niceLabel + ': <b>'+ this.x + '</b> <br/> ' 
                       + selectedMeasure.__cv_niceLabel + ': '
                       + '<b>'+ _.str.numberFormat(this.y, 4, ',', '.') + '</b>';
            }
        };
    }
    //* abstract function, called when visual rendering has completed. Allows the chart to handle any post processing steps
    public rendered (visualization:any) : void {
	//void
    };
    
    //* abstract function, called when visual rendering is removed. Allows the chart to handle any post processing steps
    public onDestroy(){
	//void
    };
}
