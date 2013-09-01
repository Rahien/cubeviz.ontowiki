/**
 * A hierarchy of elements. Can hold multiple root nodes
 */
class DataCube_Hierarchy 
{
    //* predicate used for drilling
    public drillingPredicate:string;
    //* the hierarchy information, holding the child elements for every parent uri
    public hierarchyTopDown:any;
    //* the hierarchy information, holding the parent element for every child uri
    public hierarchyBottomUp:any;
    //* top nodes of the hierarchy for every hierarchy that has been loaded, format: {name: []}
    public topNodes:any;

    constructor(drillingPredicate:string) {
	this.drillingPredicate = drillingPredicate;
	this.topNodes = {};
    };

    //* clears the current hierarchy, making sure the maps are completely empty
    public clear() : void {
	this.hierarchyTopDown = {};
	this.hierarchyBottomUp = {};
    }; 

   /**
    * loads the hierarchy information contained in the list of elements in the hierarchy elements. 
    * Loads the roots of the hierarchy into the hierarchy roots
    */
    public load(elements:any, name:string) : any {
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

	this.topNodes[name] = roots;
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

}