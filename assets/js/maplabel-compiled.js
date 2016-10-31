/*

 Copyright 2011 Google Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function MapLabel(a){this.set("fontFamily","sans-serif");this.set("fontSize",12);this.set("fontColor","#000000");this.set("strokeWeight",4);this.set("strokeColor","#ffffff");this.set("align","center");this.set("zIndex",1E3);this.setValues(a)}MapLabel.prototype=new google.maps.OverlayView;window.MapLabel=MapLabel;
MapLabel.prototype.changed=function(a){switch(a){case "fontFamily":case "fontSize":case "fontColor":case "strokeWeight":case "strokeColor":case "align":case "text":return this.drawCanvas_();case "maxZoom":case "minZoom":case "position":return this.draw()}};
MapLabel.prototype.drawCanvas_=function(){var a=this.canvas_;if(a){var b=a.style;b.zIndex=this.get("zIndex");var c=a.getContext("2d");c.clearRect(0,0,a.width,a.height);c.strokeStyle=this.get("strokeColor");c.fillStyle=this.get("fontColor");c.font=this.get("fontSize")+"px "+this.get("fontFamily");var a=Number(this.get("strokeWeight")),d=this.get("text");d&&(a&&(c.lineWidth=a,c.strokeText(d,a,a)),c.fillText(d,a,a),c=c.measureText(d).width+a,b.marginLeft=this.getMarginLeft_(c)+"px",b.marginTop="-0.4em")}};
MapLabel.prototype.onAdd=function(){var a=this.canvas_=document.createElement("canvas");a.className="map-label";a.style.position="absolute";var b=a.getContext("2d");b.lineJoin="round";b.textBaseline="top";this.drawCanvas_();(b=this.getPanes())&&b.overlayLayer.appendChild(a)};MapLabel.prototype.onAdd=MapLabel.prototype.onAdd;MapLabel.prototype.getMarginLeft_=function(a){switch(this.get("align")){case "left":return 0;case "right":return-a}return a/-2};
MapLabel.prototype.draw=function(){var a=this.getProjection();if(a&&this.canvas_){var b=this.get("position");b&&(a=a.fromLatLngToDivPixel(b),b=this.canvas_.style,b.top=a.y+"px",b.left=a.x+"px",b.visibility=this.getVisible_())}};MapLabel.prototype.draw=MapLabel.prototype.draw;MapLabel.prototype.getVisible_=function(){var a=this.get("minZoom"),b=this.get("maxZoom");if(void 0===a&&void 0===b)return"";var c=this.getMap();if(!c)return"";c=c.getZoom();return c<a||c>b?"hidden":""};
MapLabel.prototype.onRemove=function(){var a=this.canvas_;a&&a.parentNode&&a.parentNode.removeChild(a)};MapLabel.prototype.onRemove=MapLabel.prototype.onRemove;
