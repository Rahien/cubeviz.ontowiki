/// <reference path="..\DeclarationSourceFiles\jquery.d.ts" />
/// <reference path="..\DeclarationSourceFiles\jsontemplate.d.ts" />

class Module_Main {
    
    /**
     * Build component selection, with jsontemplate
     * 
     * Called by:
     * - onComplete_LoadDataSets
     */
    static buildComponentSelection ( options ) {
        console.log ( "buildComponentSelection:" );
        console.log ( options );
    }
    
    /**
     * Build selectbox for datasets
     * 
     * Called by:
     * - onComplete_LoadDataSets
     */
    static buildDataSetBox ( options ) {
        var entry = null;
        
        $("#sidebar-left-data-selection-sets").empty ();
        
        for ( var i in options ) {
            entry = $("<option value=\"" + options [i].url +"\">" + options [i].label + "</option>");            
            $("#sidebar-left-data-selection-sets").append ( entry );
        }
    }
    
    /**
     * Build selectbox for data structure definitions
     * 
     * Called by:
     * - onComplete_LoadDataStructureDefinitions
     */
    static buildDataStructureDefinitionBox ( options ) {
        var entry = null;
        
        /**
         * Fill data structure definitions selectbox 
         */
        $("#sidebar-left-data-selection-strc").empty ();
        
        for ( var i in options ) {
            entry = $("<option value=\"" + options [i].url +"\">" + options [i].label + "</option>");            
            $("#sidebar-left-data-selection-strc").append ( entry );
        }
    }
}
