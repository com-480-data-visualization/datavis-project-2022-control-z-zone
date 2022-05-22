
class MapPlot_ethnicity {
	
	makeColorbar(svg, color_scale, top_left, colorbar_size, format) {

		const scaleClass=d3.scaleLinear;

		const value_to_svg = scaleClass()
			.domain(color_scale.domain())
			.range([colorbar_size[1], 0]);

		const range01_to_color = d3.scaleLinear()
			.domain([0, 1])
			.range(color_scale.range())
			.interpolate(color_scale.interpolate());

		// Axis numbers
		const colorbar_axis = d3.axisLeft(value_to_svg)
			.tickFormat(d3.format(format))

		const colorbar_g = this.svg.append("g")
			.attr("id", "colorbar")
			.attr("transform", "translate(" + top_left[0] + ', ' + top_left[1] + ")")
			.call(colorbar_axis);

		// Create the gradient
		function range01(steps) {
			return Array.from(Array(steps), (elem, index) => index / (steps-1));
		}

		const svg_defs = this.svg.append("defs");

		const gradient = svg_defs.append('linearGradient')
			.attr('id', 'colorbar-gradient')
			.attr('x1', '0%') // bottom
			.attr('y1', '100%')
			.attr('x2', '0%') // to top
			.attr('y2', '0%')
			.attr('spreadMethod', 'pad');

		gradient.selectAll('stop')
			.data(range01(5))
			.enter()
			.append('stop')
				.attr('offset', d => Math.round(100*d) + '%')
				.attr('stop-color', d => range01_to_color(d))
				.attr('stop-opacity', 1);

		// create the colorful rect
		colorbar_g.append('rect')
			.attr('id', 'colorbar-area')
			.attr('width', colorbar_size[0])
			.attr('height', colorbar_size[1])
			.style('fill', 'url(#colorbar-gradient)')
			.style('stroke', 'black')
			.style('stroke-width', '1px')
	}

	constructor(svg_element_id, map_viz) {

		this.svg = d3.select('#' + svg_element_id);
		this.viz = map_viz

		// may be useful for calculating scales
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

		const color_scale = d3.scaleLinear()
		.range(["white", "blue"])
		//.domain([0, 1])
		.interpolate(d3.interpolateRgb);

		// California
		const projection_ca = d3.geoMercator()
			.rotate([0, 0])
			.center([-120, 37])
			.scale(1400)
			.translate([this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_ca = d3.geoPath()
			.projection(projection_ca);

		const map_promise_ca = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/CA-06-california-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_california_county_20m);
			return counties_paths.features;
		});

		// Texas
		const projection_tx = d3.geoMercator()
			.rotate([0, 0])
			.center([-99, 31])
			.scale(1400)
			.translate([this.svg_width / 2 + this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_tx = d3.geoPath()
			.projection(projection_tx);

		const map_promise_tx = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/TX-48-texas-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_texas_county_20m);
			return counties_paths.features;
		});

		var tooltip = d3.select("#map_div")
							.append("div")
							.attr('id', 'tooltip')
							.attr("class", "county_name")
							.style("position", "absolute")
							.style("visibility", "hidden")
							.style("background-color", "white")
							.style("border", "solid")
							.style("border-width", "1px")
							.style("border-radius", "5px")
							.style("padding", "10px");
		
		var mouseover = function(d) {
			d3.select(this).style('opacity', 0.6)
			d3.select('#tooltip')
				.style('opacity', 1)
				.style("visibility", "visible")
				.text(d.properties.NAME)
		}

		var mousemove = function(d) {
			d3.select('#tooltip')
				.style('left', d3.event.pageX + 10 + 'px')
				.style('top', d3.event.pageY - 55 + 'px')
		  }

		var mouseout = function(d) {
			d3.select(this).style('opacity', 1)
			d3.select('#tooltip')
				.style("visibility", "hidden")
		}
		
		// Selection button

		const selectBtn = (this.viz == "race") ? "#selectButtonRace" : "#selectButtonGender"

		// Either hardcode choices for race and sex or fetch from data
		const choices = (this.viz == "race") ? ["White", "Black", "Asian", "Hispanic"] : ["Male", "Female"]

		var selectionButton = d3.select(selectBtn)
				.selectAll('myOptions')
		    	.data(choices)
				.enter()
		  		.append('option')
				.classed("button", true)
				.text(function (d) { return d; })
				.attr("value", function (d) {return d; })

		
		//Load the data of test, it's arrest of white, find by county the number of arrest
		const arrest_ethnicity = d3.csv("../data/arrest_ethnicity.csv").then((data) => {
			let countiesID_to_arrest = {};
			data.forEach((row) => {
				if(row.year == 2009 && row.subject_race == 'white'){ 
					countiesID_to_arrest[row.county_name] = (parseFloat(row.relative_arrest));	
				}			
			});
			return countiesID_to_arrest;
		})
				

		Promise.all([map_promise_ca, map_promise_tx, arrest_ethnicity]).then((results) => {

			let map_data_ca = results[0];
			let map_data_tx = results[1];
			let nb_arrrest_ethny = results[2];


			// Order of creating groups decides what is on top
			//this.map_container_usa = this.svg.append('g');
			this.map_container_ca = this.svg.append('g');
			this.map_container_tx = this.svg.append('g');

			//add the data as a property of the county
			map_data_ca.forEach(county => {
				county.properties.arrest = nb_arrrest_ethny[county.properties.NAME];
			});


			var buttonChange = function(d) {
				var selectedOption = d3.select(this).property("value")
				console.log(selectedOption)
			}
			
			d3.select(selectBtn).on("change", buttonChange)


			this.map_container_tx.selectAll(".county")
				.data(map_data_tx)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_tx)
				.style("fill", "red")
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);

			//---------- SLIDER ----------//
			


			var dates = [2009,2010,2011,2012,2013,2014,2015,2016]; //get all dates
			var startDate = dates[0];
			var endDate = dates[dates.length - 1];



			var slider_margin = {top:0, right:50, bottom:0, left:50};
			var slider_svg = d3.select('#slider');

			const svg_slider_viewbox = slider_svg.node().viewBox.animVal;
			const svg_slider_width = svg_slider_viewbox.width - slider_margin.left - slider_margin.right;
			const svg_slider_height = svg_slider_viewbox.height  - slider_margin.top - slider_margin.bottom;

			var moving_b = false; //if slider is moving
			var currentValue = 0; //slider value
			var targetValue = svg_slider_width;
			var timer = 0;


			var x = d3.scaleLinear()
					.domain([startDate, endDate])
					.range([0, svg_slider_width])
					.clamp(true);
		
			var slider = slider_svg.append("g")
					.attr("class", "slider")
					.attr("transform", "translate(" + slider_margin.left + "," + svg_slider_height/2 + ")");

			// slider line
			slider.append("line")
				.attr("class", "track")
				.attr("x1", x.range()[0])
				.attr("x2", x.range()[1])
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-inset")
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-overlay")
				.call(d3.drag()
					.on("start.interrupt", function() { slider.interrupt(); })
					.on("start drag", function() {
						currentValue = d3.event.x;
						update(x.invert(currentValue))
					})
				);

			slider.insert("g", ".track-overlay")
				.attr("class", "ticks")
				.attr("transform", "translate(0," + 18 + ")")
				.selectAll("text")
				.data(x.ticks(8))
				.enter()
				.append("text")
				.attr("fill", "CurrentColor")
				.attr("x", x)
				.attr("y", 10)
				.attr("text-anchor", "middle")
				.text(function(d) { return d; });

			//text slider
			var label = slider.append("text")
				.attr("class", "label")
				.attr("text-anchor", "middle")
				.text(startDate)
				.attr("fill", "CurrentColor")
				.attr("transform", "translate(0," + (-25) + ")")

			//circle slider
			var handle = slider.insert("circle", ".track-overlay")
				.attr("class", "handle")
				.attr("r", 12);
			
			function update(pos) {
				//move circle
				handle.attr("cx", x(pos));

				//update the slider text
				label
					.attr("x", x(pos))
					.text(Math.round(pos));

				var date = Math.round(pos); //get date from slider pos
				
				const arrest_ethnicity = d3.csv("../data/arrest_ethnicity.csv").then((data) => {
					let countiesID_to_arrest = {};
					data.forEach((row) => {
						if(row.year == date){
							countiesID_to_arrest[row.county_name] = (parseFloat(row.relative_arrest));	
						}			
					});
					return countiesID_to_arrest;
				})

				Promise.all([arrest_ethnicity]).then((results) => {

					let nb_arrrest_ethny = results[0];
					map_data_ca.forEach(county => {
						county.properties.arrest = nb_arrrest_ethny[county.properties.NAME];
						console.log(county.properties.NAME)
						console.log(color_scale(nb_arrrest_ethny[county.properties.NAME]))
					});
					
					counties.style("fill",(d) => color_scale(d.properties.arrest));
				});
			}



			var counties = this.map_container_ca.selectAll(".county")
				.data(map_data_ca)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_ca)
				.style("fill",(d) => color_scale(d.properties.arrest))
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);	

			this.makeColorbar(this.svg, color_scale, [80, 30], [20, this.svg_height - 2*30],".0f");
		});
		
	}



}

class MapPlot_gender {
	
	makeColorbar2(svg, color_scale, top_left, colorbar_size, scaleClass=d3.scaleLog) {

		const value_to_svg_2 = scaleClass()
			.domain(color_scale.domain())
			.range([colorbar_size[1], 0]);

		const range01_to_color = d3.scaleLinear()
			.domain([0, 1])
			.range(color_scale.range())
			.interpolate(color_scale.interpolate());

		// Axis numbers
		const colorbar_axis = d3.axisLeft(value_to_svg_2)
			.tickFormat(d3.format(".0f"))

		const colorbar_g = this.svg.append("g")
			.attr("id", "colorbar")
			.attr("transform", "translate(" + top_left[0] + ', ' + top_left[1] + ")")
			.call(colorbar_axis);

		// Create the gradient
		function range01(steps) {
			return Array.from(Array(steps), (elem, index) => index / (steps-1));
		}

		const svg_defs = this.svg.append("defs");

		const gradient = svg_defs.append('linearGradient')
			.attr('id', 'colorbar-gradient_2')
			.attr('x1', '0%') // bottom
			.attr('y1', '100%')
			.attr('x2', '0%') // to top
			.attr('y2', '0%')
			.attr('spreadMethod', 'pad');

		gradient.selectAll('stop')
			.data(range01(5))
			.enter()
			.append('stop')
				.attr('offset', d => Math.round(100*d) + '%')
				.attr('stop-color', d => range01_to_color(d))
				.attr('stop-opacity', 1);

		// create the colorful rect
		colorbar_g.append('rect')
			.attr('id', 'colorbar-area')
			.attr('width', colorbar_size[0])
			.attr('height', colorbar_size[1])
			.style('fill', 'url(#colorbar-gradient_2)')
			.style('stroke', 'black')
			.style('stroke-width', '1px')

	}

	constructor(svg_element_id, map_viz) {

		const arrest_gender = d3.csv("../data/arrest_gender.csv").then((data) => {
			let countiesID_to_arrest = {};
			data.forEach((row) => {
				if(row.year == 2009 && row.subject_sex == 'male'){ 
					countiesID_to_arrest[row.county_name] = (parseFloat(row.relative_arrest));	
				}		
			});
			return countiesID_to_arrest;
		});
	

		this.svg = d3.select('#' + svg_element_id);
		this.viz = map_viz

		// may be useful for calculating scales
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

		const color_scale = d3.scaleLinear()
		.range(["white", "blue"])
		.domain([0, 1])
		.interpolate(d3.interpolateRgb);

		// California
		const projection_ca = d3.geoMercator()
			.rotate([0, 0])
			.center([-120, 37])
			.scale(1400)
			.translate([this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_ca = d3.geoPath()
			.projection(projection_ca);

		const map_promise_ca = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/CA-06-california-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_california_county_20m);
			return counties_paths.features;
		});

		// Texas
		const projection_tx = d3.geoMercator()
			.rotate([0, 0])
			.center([-99, 31])
			.scale(1400)
			.translate([this.svg_width / 2 + this.svg_width / 4, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_tx = d3.geoPath()
			.projection(projection_tx);

		const map_promise_tx = d3.json("https://raw.githubusercontent.com/deldersveld/topojson/master/countries/us-states/TX-48-texas-counties.json").then((topojson_raw) => {
			const counties_paths = topojson.feature(topojson_raw, topojson_raw.objects.cb_2015_texas_county_20m);
			return counties_paths.features;
		});

		var tooltip = d3.select("#map_div")
							.append("div")
							.attr('id', 'tooltip')
							.attr("class", "county_name")
							.style("position", "absolute")
							.style("visibility", "hidden")
							.style("background-color", "white")
							.style("border", "solid")
							.style("border-width", "1px")
							.style("border-radius", "5px")
							.style("padding", "10px");
		
		var mouseover = function(d) {
			d3.select(this).style('opacity', 0.6)
			d3.select('#tooltip')
				.style('opacity', 1)
				.style("visibility", "visible")
				.text(d.properties.NAME)
		}

		var mousemove = function(d) {
			d3.select('#tooltip')
				.style('left', d3.event.pageX + 10 + 'px')
				.style('top', d3.event.pageY - 55 + 'px')
		  }

		var mouseout = function(d) {
			d3.select(this).style('opacity', 1)
			d3.select('#tooltip')
				.style("visibility", "hidden")
		}
		
		// Selection button

		const selectBtn = (this.viz == "race") ? "#selectButtonRace" : "#selectButtonGender"

		// Either hardcode choices for race and sex or fetch from data
		const choices = (this.viz == "race") ? ["White", "Black", "Asian", "Hispanic"] : ["Male", "Female"]

		var selectionButton = d3.select(selectBtn)
				.selectAll('myOptions')
		    	.data(choices)
				.enter()
		  		.append('option')
				.classed("button", true)
				.text(function (d) { return d; })
				.attr("value", function (d) {return d; })

		Promise.all([map_promise_ca, map_promise_tx, arrest_gender]).then((results) => {

			let map_data_ca = results[0];
			let map_data_tx = results[1];
			let arrest_gender = results[2];

			// Order of creating groups decides what is on top
			//this.map_container_usa = this.svg.append('g');
			this.map_container_ca = this.svg.append('g');
			this.map_container_tx = this.svg.append('g');

			//add the data as a property of the county
			map_data_ca.forEach(county => {
				county.properties.arrest = arrest_gender[county.properties.NAME];
			});


			var buttonChange = function(d) {
				var selectedOption = d3.select(this).property("value")
				console.log(selectedOption)
			}
			
			d3.select(selectBtn).on("change", buttonChange)

				
			var counties = this.map_container_ca.selectAll(".county")
				.data(map_data_ca)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_ca)
				.style("fill", (d) => color_scale(d.properties.arrest))
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);			
			
			
			this.map_container_tx.selectAll(".county")
				.data(map_data_tx)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_tx)
				.style("fill", "red")
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);

			
			//---------- SLIDER ----------//
			


			var dates = [2009,2010,2011,2012,2013,2014,2015,2016]; //get all dates
			var startDate = dates[0];
			var endDate =dates[dates.length - 1];


			var slider_margin = {top:0, right:50, bottom:0, left:50};
			var slider_svg = d3.select('#slider2');

			const svg_slider_viewbox = slider_svg.node().viewBox.animVal;
			const svg_slider_width = svg_slider_viewbox.width - slider_margin.left - slider_margin.right;
			const svg_slider_height = svg_slider_viewbox.height  - slider_margin.top - slider_margin.bottom;

			var moving_b = false; //if slider is moving
			var currentValue = 0; //slider value
			var targetValue = svg_slider_width;
			var timer = 0;


			var x = d3.scaleLinear()
					.domain([startDate, endDate])
					.range([0, svg_slider_width])
					.clamp(true);
		
			var slider = slider_svg.append("g")
					.attr("class", "slider")
					.attr("transform", "translate(" + slider_margin.left + "," + svg_slider_height/2 + ")");

			// slider line
			slider.append("line")
				.attr("class", "track")
				.attr("x1", x.range()[0])
				.attr("x2", x.range()[1])
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-inset")
				.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
				.attr("class", "track-overlay")
				.call(d3.drag()
					.on("start.interrupt", function() { slider.interrupt(); })
					.on("start drag", function() {
						currentValue = d3.event.x;
						update(x.invert(currentValue))
					})
				);

			slider.insert("g", ".track-overlay")
				.attr("class", "ticks")
				.attr("transform", "translate(0," + 18 + ")")
				.selectAll("text")
				.data(x.ticks(8))
				.enter()
				.append("text")
				.attr("fill", "CurrentColor")
				.attr("x", x)
				.attr("y", 5)
				.attr("text-anchor", "middle")
				.text(function(d) { return d; });


			//text slider
			var label = slider.append("text")
				.attr("class", "label")
				.attr("text-anchor", "middle")
				.text(startDate)
				.attr("fill", "CurrentColor")
				.attr("transform", "translate(0," + (-25) + ")")

			//circle slider
			var handle = slider.insert("circle", ".track-overlay")
				.attr("class", "handle")
				.attr("r", 12);
			
			function update(pos) {
				//move circle
				handle.attr("cx", x(pos));

				//update the slider text
				label
					.attr("x", x(pos))
					.text(Math.round(pos));

				var date = Math.round(pos); //get date from slider pos
				
				const arrest_gender = d3.csv("../data/arrest_gender.csv").then((data) => {
					let countiesID_to_arrest = {};
					data.forEach((row) => {
						if(row.year == date && row.subject_sex == 'male'){ //change the female by button
							countiesID_to_arrest[row.county_name] = (parseFloat(row.relative_arrest));	
						}			
					});
					return countiesID_to_arrest;
				})

				Promise.all([arrest_gender]).then((results) => {

					let arrest_gender = results[0];
					map_data_ca.forEach(county => {
						county.properties.arrest = arrest_gender[county.properties.NAME];
					});
					counties.style("fill",(d) => color_scale(d.properties.arrest));
				});
			
			}
			this.makeColorbar2(this.svg, color_scale, [50, 30], [30, this.svg_height - 2*30]);
		});
		
	}



}

/*For the moment we use data from serie 4 to do the scatter plot but then
it will be the hit rate */

const TEST_TEMPERATURES = [20, 10, 40, 25, 30, 35, 27, 20];
const DAYS = ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016'];
class ScatterPlot {
	constructor(svg_element_id, data) {
		this.data = data;
		this.svg = d3.select('#' + svg_element_id);

		this.plot_area = this.svg.append('g')
			.attr('x', 10)
			.attr('y', 10);

		this.plot_area.append('rect')
			.classed('plot-background', true)
			.attr('width', 200)
			.attr('height', 100)
			.attr("fill", 'transparent');
		

		const x_value_range = [d3.min(data, d => d.x), d3.max(data, d => d.x)];

		const y_value_range = [0, d3.max(data, d => d.y)];

		const pointX_to_svgX = d3.scaleLinear()
			.domain(x_value_range)
			.range([0, 200]);

		const pointY_to_svgY = d3.scaleLinear()
			.domain(y_value_range)
			.range([100, 0]);

		this.plot_area.selectAll("circle")
			.data(data)
			.enter()
			.append("circle")
				.attr("r", 1.5) // radius
				.attr("cx", d => pointX_to_svgX(d.x)) // position, rescaled
				.attr("cy", d => pointY_to_svgY(d.y))
				.classed('cold', d => d.y <= 17) // color classes
				.classed('warm', d => d.y >= 23);

		// Create a label for each point
		this.svg.append('g')
			.selectAll('text')
			.data(data)
			.enter()
				.append('text')
				.text( d => d.name )
				.attr('x', d => pointX_to_svgX(d.x))
				.attr('y', 105);

		// Create Y labels
		const label_ys = Array.from(Array(6), (elem, index) => 20 * index); // 0 20 40 ... 180
		this.svg.append('g')
			.selectAll('text')
			.data(label_ys)
			.enter()
				.append('text')
				.text( svg_y => pointY_to_svgY.invert(svg_y).toFixed(1) )
				.attr('x', -5)
				.attr('y', svg_y => svg_y + 1);
	}
}

function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

whenDocumentLoaded(() => {
	plot_object = new MapPlot_ethnicity('map-plot', "race");
	plot_object = new MapPlot_gender('map-plot2', "gender");
	// plot object is global, you can inspect it in the dev-console
	let data = TEST_TEMPERATURES.map((value, index) => {
		return {'x': index, 'y': value, 'name': DAYS[index]};
	});
	
	let plot = new ScatterPlot('plot', data);

});
