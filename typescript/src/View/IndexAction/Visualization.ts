/// <reference path="..\..\..\declaration\libraries\Highcharts.d.ts" />
/// <reference path="..\..\..\declaration\libraries\jquery.d.ts" />
/// <reference path="..\..\..\declaration\libraries\Underscore.d.ts" />

class View_IndexAction_Visualization extends CubeViz_View_Abstract 
{
    /**
     * 
     */    
    constructor(attachedTo:string, app:CubeViz_View_Application) 
    {
        super("View_IndexAction_Visualization", attachedTo, app);
        
        // publish event handlers to application:
        // if one of these events get triggered, the associated handler will
        // be executed to handle it
        this.bindGlobalEvents([
            {
                name:    "onChange_visualizationClass",
                handler: this.onChange_visualizationClass
            },
            {
                name:    "onReRender_visualization",
                handler: this.onReRender_visualization
            },
            {
                name:    "onStart_application",
                handler: this.onStart_application
            }
        ]);
    }
    
    /**
     *
     */
    public destroy() : CubeViz_View_Abstract
    {
        super.destroy();
        
        return this;
    }
    
    /**
     * Handle exception throwing by 
     */
    public handleException(thrownException) 
    {
        this.setVisualizationHeight ();
        
        /**
         * (Copied directly from http://www.highcharts.com/errors/10)
         * Highcharts Error #10
         * 
         * Can't plot zero or subzero values on a logarithmic axis
         * This error occurs in the following situations:
         *      + If a zero or subzero data value is added to a logarithmic axis
         *      + If the minimum of a logarithimic axis is set to 0 or less
         *      + If the threshold is set to 0 or less
         */
        if(true === _.str.include(thrownException, "Highcharts error #10")) {
            $("#cubeviz-index-visualization").html(
                $("#cubeviz-visualization-tpl-notificationHightchartsException10").html()
            );
        }
        
        /**
         * No observations retrieved.
         */
        else if(true === _.str.include(thrownException, "CubeViz error no observations retrieved")) {
            
            $("#cubeviz-index-visualization")
                .html (
                    $("#cubeviz-visualization-tpl-nothingFoundNotification").text()
                );
                
            this.triggerGlobalEvent("onReceived_noData");
        }
        
        /**
         * No elements to visualize.
         */
        else if(true === _.str.include(thrownException, "CubeViz error no elements to visualize")) {
            $("#cubeviz-index-visualization")
                .html("CubeViz error no elements to visualize"); 
            
            this.triggerGlobalEvent("onVisualize_noElements");
        }
        
        // Output error
        if(false === _.isUndefined(console) && false === _.isUndefined(console.log)) { 
            console.log(thrownException);
        }
    }
    
    /**
     *
     */
    public initialize() 
    {        
        this.render();
    }
    
    /**
     *
     */
    public onChange_visualizationClass() 
    {
        this.render();
    }
    
    /**
     *
     */
    public onClick_nothingFoundNotificationLink(event) 
    {
        $("#cubeviz-visualization-nothingFoundFurtherExplanation")
            .slideDown("slow");
    }
    
    /**
     *
     */
    public onReRender_visualization() 
    {
        this.render();
    }
    
    /**
     *
     */
    public onStart_application() 
    {
        this.initialize();
    }
    
    /**
     *
     */
    public render() : CubeViz_View_Abstract
    {
        // handle exception if no observation were retrieved
        if ( 0 == _.size(this.app._.backend.retrievedObservations) ) {
            this.handleException("CubeViz error no observations retrieved");
            return this;
        }        
        
        // Dynamiclly set visualization container height
        // get chart config
        var fromChartConfig:any = CubeViz_Visualization_Controller.getFromChartConfigByClass (
                this.app._.ui.visualization.className,
                this.app._.backend.chartConfig[this.app._.data.numberOfMultipleDimensions].charts
            ),
            selectedMeasure:any = this.app._.data.selectedComponents.measure,
            type:string = null, 
            visualizationSetting:any = null;
        
        // set default className
        if(true === _.isUndefined(fromChartConfig)) {
            this.app._.ui.visualization.className = this.app._.backend.chartConfig[
                this.app._.data.numberOfMultipleDimensions
            ].charts[0].className;
            
            fromChartConfig = CubeViz_Visualization_Controller.getFromChartConfigByClass (
                this.app._.ui.visualization.className,
                this.app._.backend.chartConfig[this.app._.data.numberOfMultipleDimensions].charts
            );
        }
        
        // extract visualization settings
        visualizationSetting = CubeViz_Visualization_Controller.updateVisualizationSettings(
            [],
            this.app._.ui.visualizationSettings[this.app._.ui.visualization.className],
            fromChartConfig.defaultConfig
        );
        
        // determine if using HighCharts or CubeViz
        type = CubeViz_Visualization_Controller.getVisualizationType(
            this.app._.ui.visualization.className
        );
        
        // set attribute uri, if available
        var selectedAttributeUri = null;
        
        if ((false === _.isNull(this.app._.data.selectedComponents.attribute)
             && false === _.isUndefined(this.app._.data.selectedComponents.attribute))) {
            
            // if user wants to ignore attribute
            if (false === this.app._.data.selectedComponents.attribute.__cv_inUse) {
                // attribute uri is null
            } else {
                selectedAttributeUri = this.app._.data.selectedComponents.attribute["http://purl.org/linked-data/cube#attribute"];
            }
        }
        
        /**
         * Render chart with the given data
         */
        // if chart was created before, first destroy this instance
        if(false === _.isUndefined(this.app._.generatedVisualization)){
            try {
		this.app._.generatedVisualization._cubeviz_configuration.onDestroy(this.app._.generatedVisualization);
                this.app._.generatedVisualization.destroy();
            } catch (ex) {
                // show exception if console.log is available, check because 
                // some browsers, especially IE, did not have console defined
                if(false === _.isUndefined(console) && false === _.isUndefined(console.log)) { 
                    console.log(ex);
                }
            }
        }
        
        var hC = new CubeViz_Visualization_HighCharts();
        
        // load specific chart instance
        var chart = hC.load(this.app._.ui.visualization.className);
        
        // init chart instance
        chart.init(
            visualizationSetting,
            this.app._.backend.retrievedObservations,
            this.app._.data.selectedComponents.dimensions,
            CubeViz_Visualization_Controller.getMultipleDimensions (
                this.app._.data.selectedComponents.dimensions
            ),
            CubeViz_Visualization_Controller.getOneElementDimensions (
                this.app._.data.selectedComponents.dimensions
            ),
            selectedMeasure["http://purl.org/linked-data/cube#measure"],
            selectedAttributeUri
        );
                
        try {            
            // set visualization height
            this.setVisualizationHeight(_.size(
                chart.getRenderResult().xAxis.categories
            ));
            
            // check if at least one element to visualize
            if ( 0 == _.size(chart.getRenderResult().series) ) {
                this.handleException("CubeViz error no elements to visualize");
                return this;
            }
            
            // show chart
            this.app._.generatedVisualization = new Highcharts.Chart(
                chart.getRenderResult()
            );
	    this.app._.generatedVisualization._cubeviz_configuration = chart;

	    // give chart the option to do post processing
	    chart.rendered(this.app._.generatedVisualization);
        } catch (ex) { 
            this.handleException(ex);
        }
        
        return this;
    }
    
    /**
     * Set height of the visualization area depending on given number of y-axis
     * elements. Will return a min height or number of y-axis elements multiplied
     * with fixed pixel size.
     * @param numberOfYAxisElements Number of elements on the y axis
     * @return number New height of visualization container.
     */
    public setVisualizationHeight (numberOfYAxisElements:number = 0) 
    {
        var offset:any = $(this.attachedTo).offset(),
            minHeight:number = $(window).height() - offset.top - 95,
            tmp:number = 0;
            
        if(0 < numberOfYAxisElements) {
            tmp = numberOfYAxisElements * 40;
            if(tmp > minHeight) {
                minHeight = tmp;
            }
        }

        $(this.attachedTo).css ("height", minHeight);
    }
}
