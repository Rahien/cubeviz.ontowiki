$(document).ready(function(){
	Namespacedotjs.include('org.aksw.CubeViz.Index.Main');
    var CubeViz_Index_Main = org.aksw.CubeViz.Index.Main;
        
    CubeViz_Index_Main.init(CubeViz_Parameters_Index);
    CubeViz_Index_Main.getResultObservations(CubeViz_Link_Chosen_Index);
    
    $(body).bind("AjaxResultObservationsRetrieved.CubeViz", function() {
		CubeViz_Index_Main.processRetrievedObservations();
	});
});
