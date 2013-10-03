/// <reference path="..\..\..\..\declaration\libraries\CryptoJs.d.ts" />
/**
 * Provides helper functions
 */
class CubeViz_Visualization_Controller 
{        
    /**
     * Compute a hex color code for a given variable (usally a string) using hash algorithm.
     * @param variable Variable (usally a string) to generate a color based on
     * @return string Generated hex color code
     */
    static getColor(variable:any) : string 
    {
        var color:string = "#FFFFFF";
        
        // uri is string or number
        if(true === _.isString(variable) || true === _.isNumber(variable)) {
            color = "" + CryptoJS.MD5 (variable);
            color = "#" + color.substr((color["length"]-6), 6);
            
        // if variable is not undefined
        } else if (false === _.isUndefined(variable)) {
            color = JSON.stringify(variable);
            color = "#" + color.substr((color["length"]-6), 6);
        }
        
        return color;
    }
    
    /**
     * Returns chart config object by given class name.
     * @param className Name of the class(chart)
     * @param charts List of chart objects (must have class property)
     * @param data the data that is currently available (to allow change of default config based on data)
     * @return any|null Chart object if found, null otherwise.
     */
    static getFromChartConfigByClass(className:string, charts:any[],data:any) : any 
    {
        var result = null;
        
        _.each(charts, function(chart){
            if(true === _.isNull(result)){
                if(className == chart.className) {
                    result = chart;
		    var chartClass = eval(className);
		    if(chartClass.updateConfigByData){
			result=chartClass.updateConfigByData(result, data);
		    }
                }
            }
        });
        return result;
    }    
    
    /**
     * Get a list of all multiple (at least 2 elements) selected dimensions.
     * @param selectedComponentDimensions Object which contains all selected dimensions. 
     * @return any[] Array of found selected multiple dimensions.
     */
    static getMultipleDimensions(selectedComponentDimensions:any[]) : any [] 
    {
        // assign selected dimensions to xAxis and series (yAxis)
        var multipleDimensions:any[] = [];
        
        _.each(selectedComponentDimensions, function(selectedDimension){
                        
            // Only put entry to multipleDimensions if it have at least 2 elements    
            if(2 <= _.keys(selectedDimension.__cv_elements).length) {
                multipleDimensions.push (selectedDimension); 
            }
        });
        
        return multipleDimensions;
    }
    
    /**
     *
     */
    static getObjectValueByKeyString(keyString:string, objToAccess:any) 
    {
        var call = "objToAccess",
            result = undefined;        

        try {
            // split key and build access string
            // example: objToAccess.foo.bar
            _.each(keyString.split("."), function(key){
                call += "." + key;
            });
            eval ( "result = " + call );
        } catch (ex) {}
        
        return result;
    }
    
    /**
     * Get a list of all (exactly!) one element selected dimensions.
     * @param selectedComponentDimensions Object which contains all selected dimensions. 
     * @return any[] Array of found selected one element dimensions.
     */
    static getOneElementDimensions (selectedComponentDimensions:any[]) : any [] 
    {
        // assign selected dimensions to xAxis and series (yAxis)
        var oneElementDimensions:Object[] = [];
        
        // for ( var hashedUrl in selectedComponentDimensions ) {
        _.each(selectedComponentDimensions, function(selectedDimension){
            // Only put entry to multipleDimensions if it have at least 2 elements
            if (1 == _.keys(selectedDimension.__cv_elements).length) {
                oneElementDimensions.push(selectedDimension); 
            }
        });
        
        return oneElementDimensions;
    }
    
    /**
     * Decide where the given className is related to: HighCharts.
     * @param className Class to check
     * @return string Name of the library wrapper: CubeViz or HighCharts
     */
    static getVisualizationType (className:string) : string 
    {
        var hC = new CubeViz_Visualization_HighCharts(),
            d3js = new CubeViz_Visualization_D3js();

        // check for HighCharts
        if (true === hC.isResponsibleFor(className)) {
            return hC.getName();
        
        // check for D3js
        } else if (true === d3js.isResponsibleFor(className)) {
            return d3js.getName();
        
        // In this case no responsible library was found, so throw an error.
        } else {
            throw new Error("Unknown className " + className);
        }
    }
    
    /**
     * Replaces all links with a-tags. Copied from http://stackoverflow.com/a/7123542
     * @param inputText
     * @return string Text with replaced links.
     */
    static linkify(inputText) {
        
            // Email addresses
        var emailAddressPattern = /\w+@[a-zA-Z_]+?(?:\.[a-zA-Z]{2,6})+/gim,
        
            // www. sans http:// or https://
            pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim,

            // http://, https://, ftp://
            urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        return inputText
            .replace(urlPattern, '<a href="$&" target="_blank">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2" target="_blank">$2</a>')
            .replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');        
    }
    
    /**
     * @param chartConfig any
     * @param numberOfMultipleDimensions number      * 
     * @return Object any containing 2 elements: className and chartConfig
     */
    static getDefaultChartConfig(chartConfig:any, numberOfMultipleDimensions:number) : any
    {
        return {
            
            // set default class name: first class of according list of multiple 
            // dimensions
            className: chartConfig[numberOfMultipleDimensions].charts[0].className,
            
            chartConfig: chartConfig[numberOfMultipleDimensions].charts[0]
        };
    }
    
    /**
     * Update ChartConfig entry with new value. Required e.g. for chart selection menu.
     */
    static setChartConfigClassEntry ( className:string, charts:Object[], newValue:any ) 
    {
        for ( var i in charts ) {
            if(className == charts [i].className) {
                charts [i] = newValue;
            }
        }
    }
        
    /**
     * Generates an updated visualization setting entry based on what the user 
     * selected before in the menu.
     * @param menuItemValues List of all menu item values (usally a selectbox)
     * @param visualizationSetting Entry of visualization settings for current visz class
     * @param chartConfigEntryDefaultConfig Entry with default config for the visz class
     * @return any Updated entry
     */
    static updateVisualizationSettings(menuItemValues:any, visualizationSetting:any,
        chartConfigEntryDefaultConfig:any) : any
    {
        var call:string = "",
            optionKey:string = "", optionVal:string = "",
            updatedSetting:any = visualizationSetting || {};
            
        // visualization setting entry is an empty object, nothing was selected
        // before for the given visz class; in this case simply use default config
        // from the chartConfig
        if(0 === _.keys(updatedSetting).length){
            updatedSetting = chartConfigEntryDefaultConfig;
        }
        
        // create a clone of the given setting to avoid changing the orginally
        // one (ChartConfig.js entry) given from the server
        updatedSetting = $.parseJSON(JSON.stringify(updatedSetting));
        
        // go through all 
        _.each(menuItemValues, function(menuItemValue){
                        
            // extract key and values from menu item value
            optionKey = $(menuItemValue).data("key");
            optionVal = $(menuItemValue).val();
            
            // stop execution if select-box has no valid key
            if(true === _.isUndefined(optionKey)) {
                return;
            }
            
            // split key and set value
            call = "updatedSetting";
            _.each(optionKey.split("."), function(key){
                call += "." + key;
                eval ( call + " = " + call + " || {};" );
            });
            eval ( call + " = optionVal;" );
        });
        
        return updatedSetting;
    }
}
