/**
* CyberJapan Web access script
* distributed under FreeBSD license.
**/

/* -----------------------------
    frok from a part of webtis_v4.js 
   -----------------------------
*/
/**
*
* DenshiKokudo Web API for OpenLayers
*
* Copyright 2012, Geospatial Information Authority of Japan, released under the FreeBSD
* license. Please see http://portal.cyberjapan.jp/sys/v4/webtis/license.txt
* for the full text of the license.
*
**/

/**
*
* Contains portions of OpenLayers.js <http://openlayers.org/>
*
* Copyright 2005-2011 OpenLayers Contributors
*
* Licensed under the FreeBSD license.
* Please see http://svn.openlayers.org/trunk/openlayers/license.txt
* for the full text of the license.
*
**/

/* ======================================================================
    header.js
   ====================================================================== */

var webtis = new Object();
webtis.Feature = new Object();
webtis.Geometry = new Object();
webtis.Format = new Object();
webtis.Handler = new Object();
webtis.Control = new Object();
webtis.Layer = new Object();
webtis.Renderer = new Object();
webtis.Popup = new Object();

webtis.SERVER_URL = {
		BASEMAP_TILE_SERVER : "http://cyberjapandata.gsi.go.jp/sqras/all",//default
		BASEMAP_TILE_SERVER2 : "http://cyberjapandata2.gsi.go.jp/sqras/all",// for specific files
		SEARCH_TILE_SERVER : "http://cyberjapandata.gsi.go.jp/cgi-bin/search-tile.php",
		METADATA_SERVER : "http://cyberjapandata.gsi.go.jp/cgi-bin/get-metadata.php",
		AVAILABLE_MAP_SERVER : "http://cyberjapandata.gsi.go.jp/cgi-bin/get-available-maps.php",
		GEOTIFF_TILE_SERVER : "http://gp.cyberjapan.jp/cjp4/service/get_geotiff_tile",
		CONVERT_TO_JSON_SERVER : 'http://gp.cyberjapan.jp/cjp4/service/convert_to_json',
		CONVERT_FROM_JSON_SERVER : 'http://gp.cyberjapan.jp/cjp4/service/convert_from_json',
		SHOW_MAP_SERVER : 'http://gp.cyberjapan.jp/cjp4/service/show_map',
		SAVE_JSON_SERVER : 'http://gp.cyberjapan.jp/cjp4/service/save_json',
		CREATE_PDF_SERVER : 'http://gp.cyberjapan.jp/cjp4/service/create_pdf'
};
/* ======================================================================
    fork from Layer/BaseMap.js
   ====================================================================== */

/**
 * Class: OpenLayers.Layer.CyberJapan
 * Here is a class to present basemap of cyber japan web system information 
 * 
 * Here is using WebMercator for the projection sytem of internal treatment, 
 * and proximetory is managed by meter rules.
 * You need to point place using meter proximetory. please refer 
 * http://docs.openlayers.org/library/spherical_mercator.html
 * 
 */
OpenLayers.Layer.CyberJapan = OpenLayers.Class(OpenLayers.Layer.XYZ,{
	name : "WEBTIS",
	attribution : "国土地理院　",
	attributionTemplate : '<span>${title}${copyright}</span>',

	sphericalMercator : true,
	dataSet : null,
	wrapDateLine : false,
	zoomOffset : 0,

	url : webtis.SERVER_URL.BASEMAP_TILE_SERVER+"/${did}/latest/${z}${dir}/${x}${y}.${ext}",
	url2 : webtis.SERVER_URL.BASEMAP_TILE_SERVER2+"/${did}/latest/${z}${dir}/${x}${y}.${ext}",
	searchTileUrl : webtis.SERVER_URL.SEARCH_TILE_SERVER+"?did=${did}&zl=${z}&tid=${x}${y}&per=${per}",
	metaUrl : webtis.SERVER_URL.METADATA_SERVER,
	availableMapUrl : webtis.SERVER_URL.AVAILABLE_MAP_SERVER,

	BASE_EXTENT : new OpenLayers.Bounds(-128 * 156543.03390625,
			-128 * 156543.03390625, 128 * 156543.03390625,
			128 * 156543.03390625),
	BASE_RESOLUTIONS : [ 156543.03390625, 78271.516953125,
			39135.7584765625, 19567.87923828125,
			9783.939619140625, 4891.9698095703125,
			2445.9849047851562, 1222.9924523925781,
			611.4962261962891, 305.74811309814453,
			152.87405654907226, 76.43702827453613,
			38.218514137268066, 19.109257068634033,
			9.554628534317017, 4.777314267158508,
			2.388657133579254, 1.194328566789627,
			0.5971642833948135, 0.29858214169740677 ],
    /**
     * Constructor: OpenLayers.Layer.CyberJapan
     * Generate cybermap base map layer of cyber japan web system
     * 
     * Parameters:
     * name - {String} name of layer, default is "WEBTIS"
     * options - {Object} option parameters
     * 			-dataset : datasets for defaults.
     * 
     * Returns:
     * {<OpenLayers.Layer.CyberJapan>} layer which displays generated cyber japan base map
     * 
     * (end)
     */
	initialize : function(name, options) {
		var url = url || this.url;
		name = name || this.name;
		this.projection = new OpenLayers.Projection("EPSG:900913");
		var dataSet;
		if (options && options.dataSet) {
			dataSet = options.dataSet;
		} else {
			dataSet = this.defaultDataSet;
		}
		options = this._createOptionFromDataSet(dataSet,options);
		this.dataSet = dataSet;
		this.zoomOffset = options.minZoomLevel;

		var newArguments = [ name, url, {}, options ];
		OpenLayers.Layer.Grid.prototype.initialize.apply(this,newArguments);
		
		var metaJS = document.createElement("script");
		metaJS.setAttribute("type","text/javascript");
		var key = "j"+OpenLayers.Layer.CyberJapan.j_c;
		var that = this;
		OpenLayers.Layer.CyberJapan[key] = function(ev) {
			metaJS.parentNode.removeChild(metaJS);
			delete OpenLayers.Layer.CyberJapan[key];
			that.metaData = ev.items; 
			if (that.map) {
				that.updateAttribution();
				that.redraw();
			}
		};
		metaJS.setAttribute("src", this.availableMapUrl+"?callback=OpenLayers.Layer.CyberJapan.j"+OpenLayers.Layer.CyberJapan.j_c);
		OpenLayers.Layer.CyberJapan.j_c++;
		document.getElementsByTagName("head")[0].appendChild(metaJS);
		this.metaJS = metaJS;
	},

	/**
	 * Method: destroy
	 */
	destroy : function() {
		this.map&& this.map.events.unregister("moveend", this,this.updateAttribution);
		OpenLayers.Layer.XYZ.prototype.destroy.apply(this,arguments);
	},

	clone : function(obj) {
		if (obj == null) {
			obj = new OpenLayers.Layer.CyberJapan(this.name, this.getOptions());
		}
		obj = OpenLayers.Layer.XYZ.prototype.clone.apply(this,[ obj ]);
		return obj;
	},

	/**
	 * Method: getXYZ Calculates x, y and z for the given
	 * bounds.
	 * 
	 * Parameters: bounds - {<OpenLayers.Bounds>}
	 * 
	 * Returns: {Object} - an object with x, y and z properties.
	 */
	getXYZ : function(bounds) {
		var res = this.map.getResolution();
		var x = Math
				.round((bounds.left - this.BASE_EXTENT.left)
						/ (res * this.tileSize.w));
		var y = Math.round((this.BASE_EXTENT.top - bounds.top)
				/ (res * this.tileSize.h));
		var z = this.serverResolutions != null ? OpenLayers.Util
				.indexOf(this.serverResolutions, res)
				: this.map.getZoom() + this.zoomOffset;

		var limit = Math.pow(2, z);
		if (this.wrapDateLine) {
			x = ((x % limit) + limit) % limit;
		}

		return {
			'x' : this.zeroPad(x, 7),
			'y' : this.zeroPad(y, 7),
			'z' : z
		};
	},

	zeroPad : function(num, len) {
		var result = "" + num;
		while (result.length < len) {
			result = "0" + result;
		}
		return result;
	},

	getURL : function(bounds) {
		var xyz = this.getXYZ(bounds);
		if (!this.dataSet[xyz.z]) {
			return null;
		}
		xyz.did = this.dataSet[xyz.z]["dataId"];
		var url;
		var currentData = this.getCurrentData();
		if (currentData.endUse) {
			url = this.searchTileUrl;
			var per = "";
			if (currentData.beginUse) {
				per += currentData.begin;
			}
			per += "_";
			if (currentData.endUse) {
				per += currentData.end;
			}
			xyz.per = per;
		} else {
			var curMetaData = this.getCurrentMetaData();
			if (curMetaData == null) {
				return null;
			}
			var imageFormat = curMetaData.imageFormat.toLowerCase();
			var ext = "png";
			if (imageFormat == "png") {
				ext = "png";
			} else if (imageFormat == "jpeg") {
				ext = "jpg";
			}
			xyz.ext = ext;
			if(	(xyz.did=='JAIS2')||
				(xyz.did=='BAFD1000K2')||
				(xyz.did=='BAFD200K2')||
				(xyz.did=='D25K2')||
				(xyz.did=='JAISG')||
				(xyz.did=='BAFD1000KG')||
				(xyz.did=='BAFD200KG')||
				(xyz.did=='D25KG')||
				(xyz.did=='BLANK')||
				(xyz.did=='BLANKM')||
				(xyz.did=='BLANKC')||
				(xyz.did=='D2500')||
				(xyz.did=='D2500G')){
					url = this.url2;
			}else{
					url = this.url;
			}
			
			var dir = "";
			var xi;
			var yi;
			for (var i = 0; i < 6; i++) {
				xi = xyz.x.substr(i, 1);
				yi = xyz.y.substr(i, 1);

				dir += "/"+xi+yi;
			}
			xyz.dir = dir;
		}
		return OpenLayers.String.format(url, xyz);
	},

	updateAttribution : function() {
		if (this.map) {
			var res = this.map.getResolution();
			var z = this.serverResolutions != null ? OpenLayers.Util.indexOf(this.serverResolutions, res): this.map.getZoom() + this.zoomOffset;
			var curMetaData = this.getCurrentMetaData();
			var title = curMetaData?curMetaData.title:"";
			var copyright = curMetaData?curMetaData.owner:"国土地理院";
			this.attribution = OpenLayers.String.format(
					this.attributionTemplate, {
						title : title,
						copyright : copyright.length > 0 ? ","+copyright:""
					});
			this.map
					&& this.map.events.triggerEvent(
							"changelayer", {
								layer : this,
								property : "attribution"
							});
		}
	},
	/**
	 * APIMethod: getDefaultDataSet
	 * 
     * Returns:
     * <Object> default datasets
	 */
	getDefaultDataSet : function() {
		return this.defaultDataSet;
	},

	/**
	 * APIMethod: getOrthoDataSet
	 * 
     * Returns:
     * <Object> ortho datasets
	 */
	getOrthoDataSet : function() {
		return this.orthoDataSet;
	},

	setMap : function() {
		OpenLayers.Layer.XYZ.prototype.setMap.apply(this,
				arguments);
		this.updateAttribution();
		this.map.events.register("moveend", this,
				this.updateAttribution);
	},
	
	getZoomForExtent : function(bounds, closest) {
		var zoom = OpenLayers.Layer.XYZ.prototype.getZoomForExtent
				.apply(this, arguments);
		return zoom;
	},

	/**
	 * Generate Option from datasets
	 * 
	 * @param dataSet
	 */
	_createOptionFromDataSet : function(dataSet, options) {
		var minZoomLevel;
		var maxZoomLevel;
		for ( var key in dataSet) {
			key = parseInt(key, 10);
			if (minZoomLevel === undefined) {
				minZoomLevel = key;
			} else if (key < minZoomLevel) {
				minZoomLevel = key;
			}
			if (maxZoomLevel === undefined) {
				maxZoomLevel = key;
			} else if (key > maxZoomLevel) {
				maxZoomLevel = key;
			}
		}
		var limitTotalNum = Math.pow(2, minZoomLevel);
		var limitResolution = this.BASE_RESOLUTIONS[minZoomLevel];
		var newOptions = OpenLayers.Util.extend({
			maxExtent : new OpenLayers.Bounds(
					(-128 * limitTotalNum) * limitResolution,
					(-128 * limitTotalNum) * limitResolution,
					(128 * limitTotalNum) * limitResolution,
					(128 * limitTotalNum) * limitResolution),
			maxResolution : limitResolution,
			numZoomLevels : maxZoomLevel - minZoomLevel + 1,
			minZoomLevel : minZoomLevel,
			maxZoomLevel : maxZoomLevel,
			units : "m",
			projection : "EPSG:900913"
		}, options);
		return newOptions;
	},

	/**
	 * Method: getCurrentData
	 * 
     * Returns:
     * <Object> Current map data
	 */
	getCurrentData : function() {
		if (this.map == null) {
			return null;
		}
		return this.dataSet[this.map.getZoom() + this.zoomOffset];
	},

	/**
	 * APIMethod: getDataSet 
	 * 
     * Returns:
     * <Object> datasets of current map
	 */
	getDataSet : function() {
		return this.dataSet;
	},
	
	/**
	 * Method: getCurrentMetaData
	 * 
	 * get copyrights and license information
	 * 
     * Returns:
     * <Object> meta data of current map
	 */
	getCurrentMetaData : function() {
		var curData = this.getCurrentData();
		if (!curData) {
			return null;
		}
		var curMetaData = null;
		if (this.metaData) {
			curMetaData = this.metaData[curData.dataId];
		}
		return curMetaData;
	},

	/**
	 * APIMethod: setDataSet
	 * 
     * Parameters:
     * dataset - {Object} datasets
	 */
	setDataSet : function(dataSet) {
		var newOptions = this._createOptionFromDataSet(dataSet);
		this.dataSet = dataSet;
		this.zoomOffset = newOptions.minZoomLevel;
		this.addOptions(newOptions, true);
		this.clearGrid();
		this.redraw();
	},

	defaultDataSet : {
		0 : {
			dataId : "GLMD"
		},
		1 : {
			dataId : "GLMD"
		},
		2 : {
			dataId : "GLMD"
		},
		3 : {
			dataId : "GLMD"
		},
		4 : {
			dataId : "GLMD"
		},
		5 : {
			dataId : "JAIS"
		},
		6 : {
			dataId : "JAIS"
		},
		7 : {
			dataId : "JAIS"
		},
		8 : {
			dataId : "JAIS"
		},
		9 : {
			dataId : "BAFD1000K"
		},
		10 : {
			dataId : "BAFD1000K"
		},
		11 : {
			dataId : "BAFD1000K"
		},
		12 : {
			dataId : "BAFD200K"
		},
		13 : {
			dataId : "BAFD200K"
		},
		14 : {
			dataId : "BAFD200K"
		},
		15 : {
			dataId : "DJBMM"
		},
		16 : {
			dataId : "DJBMM"
		},
		17 : {
			dataId : "DJBMM"
		},
		18 : {
			dataId : "FGD"
		}
	},

	orthoDataSet : {
		0 : {
			dataId : "GLMD"
		},
		1 : {
			dataId : "GLMD"
		},
		2 : {
			dataId : "GLMD"
		},
		3 : {
			dataId : "GLMD"
		},
		4 : {
			dataId : "GLMD"
		},
		5 : {
			dataId : "JAIS"
		},
		6 : {
			dataId : "JAIS"
		},
		7 : {
			dataId : "JAIS"
		},
		8 : {
			dataId : "JAIS"
		},
		9 : {
			dataId : "BAFD1000K"
		},
		10 : {
			dataId : "BAFD1000K"
		},
		11 : {
			dataId : "BAFD1000K"
		},
		12 : {
			dataId : "BAFD200K"
		},
		13 : {
			dataId : "BAFD200K"
		},
		14 : {
			dataId : "BAFD200K"
		},
		15 : {
			dataId : "DJBMO"
		},
		16 : {
			dataId : "DJBMO"
		},
		17 : {
			dataId : "DJBMO"
		}
	},

	JSGI_SCALE_MAP : {
		6 : {
			scale : 10000000,
			scaleRange : {
				lower : 7000000,
				upper : Number.NaN
			}
		},
		7 : {
			scale : 5000000,
			scaleRange : {
				lower : 3500000,
				upper : 6999999
			}
		},
		8 : {
			scale : 2400000,
			scaleRange : {
				lower : 1800000,
				upper : 3499999
			}
		},
		9 : {
			scale : 1200000,
			scaleRange : {
				lower : 800000,
				upper : 1799999
			}
		},
		10 : {
			scale : 600000,
			scaleRange : {
				lower : 400000,
				upper : 799999
			}
		},
		11 : {
			scale : 300000,
			scaleRange : {
				lower : 200000,
				upper : 399999
			}
		},
		12 : {
			scale : 150000,
			scaleRange : {
				lower : 100000,
				upper : 199999
			}
		},
		13 : {
			scale : 75000,
			scaleRange : {
				lower : 50000,
				upper : 99999
			}
		},
		14 : {
			scale : 36000,
			scaleRange : {
				lower : 24000,
				upper : 49999
			}
		},
		15 : {
			scale : 18000,
			scaleRange : {
				lower : 12000,
				upper : 23999
			}
		},
		16 : {
			scale : 9000,
			scaleRange : {
				lower : 7000,
				upper : 11999
			}
		},
		17 : {
			scale : 4500,
			scaleRange : {
				lower : 3000,
				upper : 6999
			}
		},
		18 : {
			scale : 2500,
			scaleRange : {
				lower : 1500,
				upper : 2999
			}
		},
		19 : {
			scale : 1000,
			scaleRange : {
				lower : 0,
				upper : 1499
			}
		}
	},

	CLASS_NAME : "OpenLayers.Layer.CyberJapan"
});
OpenLayers.Layer.CyberJapan.j_c = 0;
/* end of a fork part of webtis_v4.js */

