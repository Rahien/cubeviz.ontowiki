declare var CubeViz_HierarchyConfig:any;

/**
 * A hierarchy of elements. Can hold multiple root nodes
 */
class DataCube_Hierarchy 
{
    //* predicate used for drilling
    public drillingPredicate:any;
    //* the hierarchy information, holding the child elements for every parent uri
    public hierarchyTopDown:any;
    //* the hierarchy information, holding the parent element for every child uri
    public hierarchyBottomUp:any;
    //* top nodes of the hierarchy for every hierarchy that has been loaded, format: {name: []}
    public topNodes:any;

    constructor(drillingPredicateUri?:string) {
	this.drillingPredicate = CubeViz_HierarchyConfig.predicatesAllowed[drillingPredicateUri];
	if(!this.drillingPredicate){
	    this.drillingPredicate = CubeViz_HierarchyConfig.defaultPredicate;
	}else{
	    // remember last choice and trigger change event to be handled in data configuration dialog
	    CubeViz_HierarchyConfig.defaultPredicate = this.drillingPredicate;
	}
	this.topNodes = {};
	this.clear();
    };

    //* clears the current hierarchy, making sure the maps are completely empty
    public clear() : void {
	this.hierarchyTopDown = {};
	this.hierarchyBottomUp = {};
    }; 

    public getDrillingPredicateUri() : string {
	return this.drillingPredicate.uri;
    };

   /**
    * loads the hierarchy information contained in the list of elements in the hierarchy elements. Requires elements to be a map: uri -> element
    * Loads the roots of the hierarchy into the hierarchy roots
    */
    public load(elements:any, name:string) : void {
	if(this.drillingPredicate.inverted){
	    this.loadInverted(elements,name);
	    return;
	}
	var self:any = this;
	var roots = [];
        _.each(elements, function(element){
	    var parent = (element.self || element)[self.getDrillingPredicateUri()];
	    var elementUri = (element.self || element).__cv_uri;
	    if(parent && typeof parent == "string"){
		
		if(!elements[parent]){
		    return;
		}
		
		self.hierarchyBottomUp[elementUri]=elements[parent];
		if(!self.hierarchyTopDown[parent]){
		    self.hierarchyTopDown[parent] = {};
		}
		// want to have a set of elements, not a list with duplicates. This is the easiest way to check that
		self.hierarchyTopDown[parent][elementUri] = element;
	    }else if(parent){
		for(var prop in parent){
		    var singleParent = parent[prop];
		    if(!elements[singleParent]){
			continue;
		    }

		    self.hierarchyBottomUp[elementUri]=elements[singleParent];
		    if(!self.hierarchyTopDown[singleParent]){
			self.hierarchyTopDown[singleParent] = {};
		    }
		    self.hierarchyTopDown[singleParent][elementUri] = element;
		}
	    }else{

	    }
	});

	_.each(elements, function(element){
	    var elementUri = (element.self || element).__cv_uri;
	    if(!self.hierarchyBottomUp[elementUri]){
		roots.push(element);
	    }
	});


	this.topNodes[name] = roots;
    };

   /**
    * loads the hierarchy information contained in the list of elements in the hierarchy elements. Requires elements to be a map: uri -> element
    * Loads the roots of the hierarchy into the hierarchy roots
    * assumes the drilling predicate is an inverted one
    */
    public loadInverted(elements:any, name:string) : void {
	var self:any = this;
	var roots = [];
        _.each(elements, function(element){
	    var child = (element.self || element)[self.getDrillingPredicateUri()];
	    var elementUri = (element.self || element).__cv_uri;
	    if(child && typeof child == "string"){
		self.hierarchyBottomUp[child]=element;
		if(!elements[child]){
		    //parent not in selection
		    return;
		}
		if(!self.hierarchyTopDown[elementUri]){
		    self.hierarchyTopDown[elementUri] = {};
		}
		// want to have a set of elements, not a list with duplicates. This is the easiest way to check that
		self.hierarchyTopDown[elementUri][child] = elements[child];
	    }else if(child){
		for(var prop in child){
		    var singleChild = child[prop];
		    self.hierarchyBottomUp[singleChild]=element;
		    if(!elements[singleChild]){
			// parent not in selection
			continue;
		    }
		    if(!self.hierarchyTopDown[elementUri]){
			self.hierarchyTopDown[elementUri] = {};
		    }
		    self.hierarchyTopDown[elementUri][singleChild] = elements[singleChild];
		}
	    }else{
		//void
	    }
	});

	_.each(elements, function(element){
	    var elementUri = (element.self || element).__cv_uri;
	    if(!self.hierarchyBottomUp[elementUri]){
		roots.push(element);
	    }
	});

	this.topNodes[name] = roots;
    };

    //* loads the array of elements into the hierarchy (see load)
    public loadArray(elements:any, name:string) : void {
	var mappedElements : any = {};
	_.each(elements, function(element){
	    var elementUri = (element.self || element).__cv_uri;
	    mappedElements[elementUri] = element;
	});
	this.load(mappedElements, name);
    };

    //* returns the children of the given element in the hierarchy
    public getChildren(element:any) : any[] {
	if(!element){
	    return [];
	}

	var list = [];
	var children = this.hierarchyTopDown[((element.self || element).__cv_uri) || element];
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
	return this.getParentByUri(element?(element.self || element).__cv_uri:element);
    };
        
    //* uses the uri of the element to look up its parent
    public getParentByUri(elementUri:string) : any {
	if(!elementUri){
	    return null;
	}
	return this.hierarchyBottomUp[elementUri];
    };

    //* whether or not the hierarchy contains the element
    public containsElement(element:any) :bool {
	var elementUri=element?(element.self || element).__cv_uri:element;
	return !!(this.hierarchyBottomUp[elementUri] || this.hierarchyTopDown[elementUri]);
    };

    //* returns a div holding a label for the element that expresses the hierarchy
    public htmlElementLabel(element:any) :string {
	if(!this.containsElement(element)){
	    return null;
	}
	var s = "<div>"+(element.self || element).__cv_niceLabel+"</div>";
	var current = element;
	var parent;
	while (parent = this.getParent(current)){
	    s = "<div>"+(parent.self || parent).__cv_niceLabel+" &gt; </div>" + s;
	    current = parent;
	}
	return s;
    }

    //* returns a string holding a label for the element that expresses the hierarchy
    public stringElementLabel(element:any) :string {
	if(!this.containsElement(element)){
	    return null;
	}
	var s = (element.self || element).__cv_niceLabel;
	var current = element;
	var parent;
	while (parent = this.getParent(current)){
	    s = (parent.self || parent).__cv_niceLabel+" > " + s;
	    current = parent;
	}
	return s;
    }

    //* returns all root nodes that have been loaded into the hierarchy
    public getRootNodes() : any {
	var roots=[];
	for(var prop in this.topNodes){
	    for(var i=0, root; root=this.topNodes[prop][i]; i++){
		roots.push(root);
	    }
	}
	return roots;
    }

    //* returns the elements that are descendants of the given node and that are #level steps away from the target. If targetElement is null, takes all root nodes
    public getElementsOnLevel(targetElement:any, level:number){
	level = Math.max(1,level);

	var currentLevel = 0;	
	var descendants = [targetElement];
	if(!targetElement){
	    descendants = this.getRootNodes();
	    currentLevel = 1; 
	}

	while (currentLevel < level){
	    var newDescendants = [];
	    for(var i=0, child; child=descendants[i]; i++){
		var children = this.getChildren(child);
		for(var j=0, toAdd; toAdd=children[j]; j++){
		    newDescendants.push(toAdd);
		}
	    }
	    descendants= newDescendants;
	    currentLevel++;
	}
	return descendants;
    }

    //* returns a set of all predicates in any dimension value. Assumes something to be a predicate if it does not start with _
    static getAllDimensionValuePredicates(data:any): any{
	var map:any= {};
	for(var dim in data.components.dimensions){
	    for(var i=0, dimVal; dimVal=data.components.dimensions[dim].__cv_elements[i]; i++){
		for(var prop in dimVal){
		    if(prop.indexOf('_') !== 0){
			map[prop] = true;
		    }
		}
	    }
	}
	return map;
    }

    //* calculates the default predicate to show for the hierarchy.
    static calculateDefaultPredicate(data:any) : string {
	var predicates = DataCube_Hierarchy.getAllDimensionValuePredicates(data);

	if(predicates[CubeViz_HierarchyConfig.defaultPredicate.uri]){
	    return CubeViz_HierarchyConfig.defaultPredicate.uri;
	}
	
	for(var predicate in predicates){
	    
	    if(CubeViz_HierarchyConfig.predicatesAllowed[predicate]){
		return predicate;
	    }
	}
	return CubeViz_HierarchyConfig.defaultPredicate.uri;
    }

}