class MapPlot {
	
	makeColorbar(svg, color_scale, top_left, colorbar_size, format) {

		const value_to_svg =  d3.scaleLinear()
			.domain(color_scale.domain())
			.range([colorbar_size[1], 0]);

		const range01_to_color = d3.scaleLinear()
			.domain([0, 1])
			.range(color_scale.range())
			.interpolate(color_scale.interpolate());

		// Axis numbers
		const colorbar_axis = d3.axisLeft(value_to_svg)
			.tickFormat(d3.format(format))
			.tickPadding(15);

		const colorbar_g = this.svg.append("g")
			.attr("id", "colorbar")
			.attr("transform", "translate(" + top_left[0]+ ', ' + top_left[1] + ")")
			.call(colorbar_axis);

		// Create the gradient
		function range01(steps) {
			return Array.from(Array(steps), (elem, index) => index / (steps-1));
		}

		svg.append("text")
			.attr("class", "y label")
			.attr("text-anchor", "end")
			.attr("x", - 250)
			.attr("y", 20)
			//.attr("y", top_left[0])
			.style("font-size", "15px")
			.attr("transform", "rotate(-90)")
			.text("Number of stops (log10)");

		const svg_defs = this.svg.append("defs");

		const gradient = svg_defs.append('linearGradient')
			.attr('id', 'colorbar-gradient')
			.attr('x1', '0%') // bottom
			.attr('y1', '100%')
			.attr('x2', '0%') // to top
			.attr('y2', '0%')
			.attr('spreadMethod', 'pad');

		gradient.selectAll('stop')
			.data(range01(10))
			.enter()
			.append('stop')
				.attr('offset', d => 100*d + '%')
				.attr('stop-color', d => range01_to_color(d))
				.attr('stop-opacity', 1);

		// create the colorful rect
		colorbar_g.append('rect')
			.attr('id', 'colorbar-area')
			.attr('width', colorbar_size[0])
			.attr('height', colorbar_size[1])
			//.attr("transform", "translate(" + top_left[0] + ', ' + top_left[1] + ")")
			.style('fill', 'url(#colorbar-gradient)')
			.style('stroke', 'black')
			.style('stroke-width', '1px');
	}

	constructor(svg_element_id, map_viz) {

		this.svg = d3.select('#' + svg_element_id);

		//------------------------------- MAP ----------------------------------//

		const viz = map_viz

		// may be useful for calculating scales
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

		// California
		const projection_ca = d3.geoMercator()
			.rotate([0, 0])
			.center([-120, 37])
			.scale(1400)
			.translate([this.svg_width / 4 + 20, this.svg_height / 2]) // SVG space
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

			var html_text = ""

			if (d.properties.stops > 0) html_text = ("<b>" + d.properties.NAME + "</b> <br> <br> Stops: " + d.properties.stops + "<br> Relative stops: " 
													+ d.properties.relative_stops.toFixed(4) + "<br> Population: " + d.properties.population)
			else html_text = "<b>" + d.properties.NAME + "</b> <br> <br> <i> Less than 100 stops </i>"
			d3.select(this).style('opacity', 0.6)
			d3.select('#tooltip')
				.style('opacity', 1)
				.style("visibility", "visible")
				.html(html_text)
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

		// Selection selector
		const selectBtn = (viz == "race") ? "#selectButtonRace" : "#selectButtonGender"

		// Either hardcode choices for race and sex or fetch from data
		const choices = (viz == "race") ? ["white", "black", "asian/pacific islander", "hispanic"] : ["male", "female"]

		var selectionButton = d3.select(selectBtn)
				.selectAll('myOptions')
		    	.data(choices)
				.enter()
		  		.append('option')
				.classed("selector", true)
				.text(function (d) { return d; })
				.attr("value", function (d) {return d; })
				
		
		const data_path_map = (viz == "race") ? "data/arrest_ethnicity.csv" : "data/arrest_gender.csv"
		
		//Load the data of test, it's arrest of white, find by county the number of arrest
		const data_promise_map = d3.csv(data_path_map).then((data) => {
			return data
		})

		const data_path_graph = (viz == "race") ? "data/count_ethnicity_state.csv" : "data/count_gender_state.csv"

		//Load the data of test, it's arrest of white, find by county the number of arrest
		const data_promise_graph = d3.csv(data_path_graph).then((data) => {
			return data
		})

		Promise.all([map_promise_ca, map_promise_tx, data_promise_map, data_promise_graph]).then((results) => {

			const stop_min = 100

			let map_data_ca = results[0];
			let map_data_tx = results[1];
			let data_map = results[2].filter(x => x.nb_arrest > stop_min); // remove counties with less than < 100 stops
			let data_graph = results[3]

			var counties_id_stops = {}
			var dates = [...new Set(data_map.map(x=> x.year))].sort() //get all dates
			var state_choices = [...new Set(data_graph.map(x=> x.state))]

			var domain_min = 0.0
			var domain_max = 0.0

			function getCountiesInfo(row) {

				var temp_dict = {}

				temp_dict["stops"] = parseInt(row.nb_arrest)
				temp_dict["relative_stops"] = Math.log10(temp_dict["stops"])
				temp_dict["population"] = parseInt(row.population)

				return temp_dict
			}

			if (viz == "race") {

				const df = data_map.filter(x => (x.year == dates[0]) && x.subject_race == choices[0])

				//domain_max = Math.ceil(Math.max.apply(Math, df.map(x => x.relative_arrest)))

				const df_domain =  df.map(x => Math.log10(x.nb_arrest))
				domain_min = Math.floor(Math.min.apply(Math, df_domain))
				domain_max = Math.ceil(Math.max.apply(Math, df_domain))

				df.forEach((row) => {
					counties_id_stops[row.county_name] = getCountiesInfo(row)
				})

			} else {

				const df = data_map.filter(x => (x.year == dates[0]) && x.subject_sex == choices[0])

				//domain_max = Math.ceil(Math.max.apply(Math, df.map(x => x.relative_arrest)))
				
				const df_domain =  df.map(x => Math.log10(x.nb_arrest))
				domain_min = Math.floor(Math.min.apply(Math, df_domain))
				domain_max = Math.ceil(Math.max.apply(Math, df_domain))

				df.forEach((row) => {
					counties_id_stops[row.county_name] = getCountiesInfo(row)
				})
			}

			// Order of creating groups decides what is on top
			//this.map_container_usa = this.svg.append('g');
			this.map_container_ca = this.svg.append('g');
			this.map_container_tx = this.svg.append('g');

			function setMapInfos(county) {

				const county_name = county.properties.NAME

				var county_stops = 0
				var county_relative_stops = 0.0
				var county_population = 0.0

				if (county_name in counties_id_stops) {

					const county_dict = counties_id_stops[county.properties.NAME]

					county_stops = county_dict["stops"];
					county_relative_stops = county_dict["relative_stops"];
					county_population = county_dict["population"];

				}

				county.properties.stops = county_stops
				county.properties.relative_stops = county_relative_stops
				county.properties.population = county_population
			}

			//add the data as a property of the county
			map_data_ca.forEach(county => {
				setMapInfos(county)
			});

			map_data_tx.forEach(county => {
				setMapInfos(county)
			});

			var selectorChange = function() {
				var selectedOption = d3.select(this).property("value")
				updateSelector(selectedOption)
			}
			
			d3.select(selectBtn).on("change", selectorChange)

			const color_scale = d3.scaleLinear()
				.range(["white", "red"])
				.domain([domain_min, domain_max])
				.interpolate(d3.interpolateRgb);
			
			const none_color = "white"

			var counties_tx = this.map_container_tx.selectAll(".county")
				.data(map_data_tx)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_tx)
				.style("fill",(d) => {
					if (d.properties.stops == 0) return none_color
					else return color_scale(d.properties.relative_stops)})
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);

			var counties_ca = this.map_container_ca.selectAll(".county")
				.data(map_data_ca)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_ca)
				.style("fill",(d) => {
					if (d.properties.stops == 0) return none_color
					else return color_scale(d.properties.relative_stops)})
				.on("mouseover", mouseover)
				.on('mousemove', mousemove)
				.on("mouseout", mouseout);	


			function updateMapData(date, selector) {

				counties_id_stops = {}

				if (viz == "race") {
					data_map.filter(x => (x.year == date) && x.subject_race == selector).forEach((row) => {
						counties_id_stops[row.county_name] = getCountiesInfo(row)
					})
				} else {
					data_map.filter(x => (x.year == date) && x.subject_sex == selector).forEach((row) => {
						counties_id_stops[row.county_name] = getCountiesInfo(row)
					})
				}

				map_data_ca.forEach(county => {
					setMapInfos(county)
				});
				map_data_tx.forEach(county => {
					setMapInfos(county)
				});

				counties_ca.style("fill",(d) => {if (d.properties.stops == 0) return none_color
												else return color_scale(d.properties.relative_stops)});
				counties_tx.style("fill",(d) => {if (d.properties.stops == 0) return none_color
												else return color_scale(d.properties.relative_stops)});
			}
			
			function update(pos, selector) {
				//move circle
				handle.attr("cx", x(pos));

				//update the slider text
				label
					.attr("x", x(pos))
					.text(Math.floor(pos));

				var date = Math.floor(pos); //get date from slider pos

				updateMapData(date, selector)
				
			}

			function updateSelector(selector) {

				var date = Math.floor(x.invert(currentValue))

				updateMapData(date, selector)
				updateChartData(data_graph, selector, state_choices)
			}

			//------------------------------- GRAPH ----------------------------------//


			// set the dimensions and margins of the graph
			var chart_margin = {top: 5, right: 50, bottom: 30, left: 100};

			const line_chart = (viz == "race") ? "#line-chart" : "#line-chart2"
			const chart_svg_ = (viz == "race") ? "chart_svg" : "chart_svg2"

			// apppend a svg
			var chart = d3.select(line_chart)
						.append("svg")
						.attr("id", chart_svg_)
						.attr("viewBox", "0 0 960 150")
						.attr("width", "70%")
						.append("g")
						.attr("transform",
							"translate(" + chart_margin.left + "," + chart_margin.top + ")");

			var chart_svg = d3.select("#" + chart_svg_)

			//get dimension of the svg
			const svg_chart_viewbox = chart_svg.node().viewBox.animVal;
			const svg_chart_width = svg_chart_viewbox.width - chart_margin.left - chart_margin.right;
			const svg_chart_height = svg_chart_viewbox.height  - chart_margin.top - chart_margin.bottom;

			//horizontal axis and scale
			var x_chart = d3.scaleTime().range([ 0, svg_chart_width]);
			var x_chart_axis = d3.axisBottom().scale(x_chart);

			chart.append("g")
				.attr("class","x_axis")
				.attr("transform", "translate(0," + svg_chart_height + ")");

			//vertical axis and scale
			var y_chart = d3.scaleLinear().range([svg_chart_height, 5]);
			var y_chart_axis = d3.axisLeft().scale(y_chart).ticks(5).tickPadding(40);

			chart.append("g")
				.attr("class","y_axis");

			
			function updateChartLine(chart_svg, data, color_line) {

				chart_svg.append("path")
						.classed("line_graph", true)
						.datum(data)
						.transition()
						.duration(300)
						.attr("transform", "translate( "+ chart_margin.left +",0)")
						.attr("d", d3.line()
								.x(function(d) { return x_chart(new Date(d.year))})
								.y(function(d) { return y_chart(d.percentage) }))
						.attr("fill", "none")
						.attr("stroke", color_line)
						.attr("stroke-width", 1.5)
			}

			function updateChartData(data, selector, state_choices) {

				const data_selector = (viz == "race") ? data.filter(x => x.subject_race == selector) : data.filter(x => x.subject_sex == selector)

				// Create the horizontal axis with call():
				x_chart.domain(d3.extent(data_selector, function(d) { return new Date(d.year); }));

				chart.selectAll(".x_axis").transition()
					.duration(300)
					.call(x_chart_axis);

				// Create the vertical axis with call():
			  	y_chart.domain([0,d3.max(data_selector.map(x => parseInt(x.percentage)))]);


				chart.selectAll(".y_axis")
					.transition()
					.duration(300)
					.call(y_chart_axis);

				chart_svg.selectAll("path").classed("line_graph", function (d,i) {
					var elem = d3.select(this)
					if (elem.classed("line_graph")) elem.remove()
				})

				const color_choices = ["steelblue", "red"]

				state_choices.forEach((state, i) => {
					updateChartLine(chart_svg, data_selector.filter(x => x.state == state), color_choices[i])	
				})
						
			}

			//call the fucntion created with defalut dataset
			updateChartData(data_graph, choices[0], state_choices)

			//------------------------------- SLIDER ----------------------------------//
			
			var startDate = dates[0];
			var endDate = dates[dates.length - 1];

			var slider_margin = {top:0, right:50, bottom:0, left: chart_margin.left};

			var slider_svg = d3.select((viz == "race") ? '#slider' : "#slider2");

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
						update(x.invert(currentValue),d3.select(selectBtn).property("value"))
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
				.style("font-size", "15px")
				.text(function(d) { return d; });

			//text slider
			var label = slider.append("text")
				.attr("class", "label")
				.attr("text-anchor", "middle")
				.text(startDate)
				.attr("fill", "CurrentColor")
				.style("font-size", "15px")
				.attr("transform", "translate(0," + (-25) + ")")

			//circle slider
			var handle = slider.insert("circle", ".track-overlay")
				.attr("class", "handle")
				.attr("r", 12);


			this.makeColorbar(this.svg, color_scale, [70, 70], [20, this.svg_height * 2/3],".1f");
		});	
	}
}



class ScatterPlot {

	
	constructor(svg_element_id) {
		this.svg = d3.select('#' + svg_element_id);
		
		const viz = "race"

		
		const data_path = (viz == "race") ? "data/city/all_hit_rate_ethnicity_mean.csv" : "data/city/all_hit_rate_gender_mean.csv"

		const hit_rate_promise = d3.csv(data_path).then((data) => {
			return data
		})

		
		Promise.all([hit_rate_promise]).then((results) => {

			let hit_rate = results[0];
			
			var counties_id_hit_rate_ca = []
			var counties_id_hit_rate_tx = []
			var total_arrest = []
			var label = []
			var dates = [...new Set(hit_rate.map(x=> x.year))].sort() //get all dates
			var ethni = 'base'

			if (viz == "race") {
				hit_rate.filter(x => (x.year == dates[0] && x.County == 'ca')).forEach((row) => { // x.subject_race == choices[0] &&
					counties_id_hit_rate_ca.push((parseFloat(row.mean)))
					total_arrest.push((parseFloat(row.sum)))
					ethni = row.subject_race
					console.log(parseFloat(row.mean))
					//console.log(total_arrest)
					label.push(row.subject_race)
					console.log(ethni)		
				})
				hit_rate.filter(x => (x.year == dates[0] &&  x.County == 'tx' )).forEach((row) => {// x.subject_race == choices[0] &&
					counties_id_hit_rate_tx.push((parseFloat(row.mean)))
					console.log(row.mean)
				})
			 } else {
			 	hit_rate.filter(x => (x.year == dates[0]) && x.subject_sex == choices[0]).forEach((row) => {
					
			 		counties_id_hit_rate.push((parseFloat(row.mean)))
			 		total_arrest.push((parseFloat(row.sum)))

			 	})
			 }
			

			let data_ca = counties_id_hit_rate_ca.map((value, index) => {
				return {'index': index, 'y': value, 'x' :  counties_id_hit_rate_tx[index], 'r' : total_arrest[index], 'label' : label[index]};
			});
			


			this.plot_area = this.svg.append('g')
			 .attr('x', 10)
			 .attr('y',  10); 

			this.plot_area.append('rect')
			 .classed('plot-background', true)
			 .attr('width', this.svg.width)
			 .attr('height', this.svg.height)
			 .attr("fill", 'transparent');

			const x_value_range = [0, 100];//d3.min(data_ca, d => d.x)  d3.max(data_ca, d => d.x)

			//const y_value_range = [0, d3.max(data_ca, d => d.y)];
			const y_value_range = [0, 100];
			const pointX_to_svgX = d3.scaleLinear()
			 	.domain(x_value_range)
			 	.range([0, 100]);

			const pointY_to_svgY = d3.scaleLinear()
			 	.domain(y_value_range)
			 	.range([100, 0]);
				
			var myColor = d3.scaleOrdinal()
			.domain(label)
			.range(d3.schemeSet1);

			var map_hit = this.plot_area.selectAll("circle")
			  	.data(data_ca)
			  	.enter()
			  	.append("circle")
					.attr("class", function(d) { return "bubbles " + d.label})
			  		.attr("cx", d =>  pointX_to_svgX(d.x|| 0)) // position, rescaled 
			  		.attr("cy", d => pointY_to_svgY(d.y|| 0)) //
					.attr("r", d => d.r *0.002)
					.style("fill", function (d) { return myColor(d.label); } )
			//  		.classed('cold', d => d.y <= 17) // color classes
			//  		.classed('warm', d => d.y >= 23);
			

			var size = 2

			var highlight = function(d){
				// reduce opacity of all groups
				d3.selectAll(".bubbles").style("opacity", .05)
				// expect the one that is hovered
				d3.selectAll("."+d).style("opacity", 1)
			}

			var noHighlight = function(d){
				d3.selectAll(".bubbles").style("opacity", 1)
			}
			//console.log(label)
			var label = this.svg.selectAll("myrect")
			  .data(label)
			  .enter()
			  .append("circle")
				.attr("cx", 105)
				.attr("cy", function(d,i){ return 15 + i*(size+5)}) 
				.attr("r", 1)
				.style("fill", function(d){ return myColor(d)})
				.on("mouseover", highlight)
        		.on("mouseleave", noHighlight)


					// // Create Y labels
			const label_ys = Array.from(Array(6), (elem, index) => 20 * index); // 0 20 40 ... 180
			var axis_y = this.svg.append('g')
				.selectAll('text')
				.data(label_ys)
				.enter()
					.append('text')
					.text( svg_y => pointY_to_svgY.invert(svg_y).toFixed(1) )//
					.attr('x', -5)
					.attr('y', svg_y => svg_y + 1);

			var axis_x = this.svg.append('g')
			.selectAll('text')
			.data(label_ys)
			.enter()
				.append('text')
				.text( svg_x => pointX_to_svgX.invert(svg_x).toFixed(1))//
				.attr('x', svg_x => svg_x + 1)
				.attr('y', 105);


			function updateMapData(date) {
				console.log(date)
				var counties_id_hit_rate_ca = []
				var counties_id_hit_rate_tx = []
				var total_arrest = []
				var label = []
				if (viz == "race") {
					hit_rate.filter(x => (x.year == date && x.County == 'ca')).forEach((row) => { // x.subject_race == choices[0] &&
						counties_id_hit_rate_ca.push((parseFloat(row.mean)))
						total_arrest.push((parseFloat(row.sum)))
						//console.log(counties_id_hit_rate_ca)
						label.push(row.subject_race)
					})
					hit_rate.filter(x => (x.year == date &&  x.County == 'tx')).forEach((row) => {// x.subject_race == choices[0] &&
						counties_id_hit_rate_tx.push((parseFloat(row.mean)))		
					})
				} else {
					hit_rate.filter(x => (x.year == date) ).forEach((row) => {
						counties_id_hit_rate.push((parseFloat(row.mean)))
						total_arrest.push((parseFloat(row.sum)))
	
					})
				}
				console.log(data_ca)

				data_ca = counties_id_hit_rate_ca.map((value, index) => {
					return {'index': index, 'y': value, 'x' :  counties_id_hit_rate_tx[index], 'r' : total_arrest[index], 'label' : label[index]};
				});


				map_hit
			  	.data(data_ca)
				.attr("cx", d => pointX_to_svgX(d.x|| 0) ) // position, rescaled
				.attr("cy", d => pointY_to_svgY(d.y|| 0))
				.attr("r", d => d.r *0.002)


				
			}
			
			function update(pos) {
				//move circle
				handle.attr("cx", x(pos));

				//update the slider text
				label
					.attr("x", x(pos))
					.text(Math.floor(pos));

				var date = Math.floor(pos); //get date from slider pos

				updateMapData(date)
				
			}
	


			//---------- SLIDER ----------//
			
			var startDate = dates[0];
			var endDate = dates[dates.length - 1];

			var slider_margin = {top:0, right:50, bottom:0, left:50};

			var slider_svg = d3.select('#slider3');

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
				.style("font-size", "15px")
				.text(function(d) { return d; });

			//text slider
			var label = slider.append("text")
				.attr("class", "label")
				.attr("text-anchor", "middle")
				.text(startDate)
				.attr("fill", "CurrentColor")
				.style("font-size", "15px")
				.attr("transform", "translate(0," + (-25) + ")")

			//circle slider
			var handle = slider.insert("circle", ".track-overlay")
				.attr("class", "handle")
				.attr("r", 12);
		});

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
	map1 = new MapPlot('map-plot', "race");
	map2 = new MapPlot('map-plot2', "gender");
	// plot object is global, you can inspect it in the dev-console
	
	let plot = new ScatterPlot('plot');

});
