<?php
/**
 * This class represents a DimensionFactory
 *
 * @copyright Copyright (c) 2012, {@link http://aksw.org AKSW}
 * @license http://opensource.org/licenses/gpl-license.php GNU General Public License (GPL)
 * @category OntoWiki
 * @package Extensions
 * @subpackage Cubeviz
 * @author Ivan Ermilov
 * @author Konrad Abicht
 */
class DataCube_VocabularyTerms_DimensionComponentFactory extends ArrayObject
{    
	public function __construct() {
		$this ['selectedDimensionComponents'] = array();
	}
	
	/**
	 * @param $dimensionComponents 
	 */	
	public function initFromArray($dimensionComponents) {
		$selectedDimensionComponents_length = sizeof($selectedDimensionComponents);
		while($selectedDimensionComponents_length--) {
			$current_dimensionComponent = $selectedDimensionComponents[$selectedDimensionComponents_length];
			$dimensionComponent = new DataCube_DimensionComponent($current_dimensionComponent['property'], $current_dimensionComponent['label']);
			array_push($this ['selectedDimensionComponents'], $dimensionComponent);
		}
	}
}
