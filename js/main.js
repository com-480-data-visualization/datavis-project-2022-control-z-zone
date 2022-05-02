
class MapPlot {

	constructor(svg_element_id) {
		this.svg = d3.select('#' + svg_element_id);

		// may be useful for calculating scales
		const svg_viewbox = this.svg.node().viewBox.animVal;
		this.svg_width = svg_viewbox.width;
		this.svg_height = svg_viewbox.height;

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

		// USA
		const projection_usa = d3.geoMercator()
			.rotate([0, 0])
			.center([-97, 39])
			.scale(700)
			.translate([this.svg_width / 2, this.svg_height / 2]) // SVG space
			.precision(.1);

		// path generator to convert JSON to SVG paths
		const path_generator_usa = d3.geoPath()
			.projection(projection_usa);

		const map_promise_usa = d3.json("https://gist.githubusercontent.com/chrispolley/49740980c7d3bdc0b641fe9cb7fa5f01/raw/ef21b721a3bb92c70adee5a2802a63d91826de79/USAdrop1.json").then((topojson_raw) => {
			const states_paths = topojson.feature(topojson_raw, topojson_raw.objects.USAdrop1);
			console.log(states_paths.features)
			return states_paths.features;
		});


		var tooltip = d3.select("#map_div")
							.append("div")
							.attr('id', 'tooltip')
							.attr("class", "county_name")
							.style("position", "absolute")
							.style("visibility", "visible")
							.style("background-color", "white")
							.style("border", "solid")
							.style("border-width", "1px")
							.style("border-radius", "5px")
							.style("padding", "10px");
		
		var mouseover = function(d) {
			d3.select(this).style('opacity', 0.6)
			d3.select('#tooltip').style('opacity', 1).text(d.properties.NAME)
		}

		var mousemove = function(d) {
			d3.select('#tooltip')
				.style('left', d3.event.pageX + 10 + 'px')
				.style('top', d3.event.pageY - 55 + 'px')
		  }

		var mouseout = function(d) {
			d3.select(this).style('opacity', 1)
			d3.select('#tooltip').style('opacity', 0)
		}

		Promise.all([map_promise_ca, map_promise_tx, map_promise_usa]).then((results) => {
			let map_data_ca = results[0];
			let map_data_tx = results[1];
			let map_data_usa = results[2];

			// Order of creating groups decides what is on top
			//this.map_container_usa = this.svg.append('g');
			this.map_container_ca = this.svg.append('g');
			this.map_container_tx = this.svg.append('g');

		
			// this.map_container_usa.selectAll(".state")
			// 	.data(map_data_usa)
			// 	.enter()
			// 	.append("path")
			// 	.classed("state", true)
			// 	.attr("d", path_generator_usa)
			// 	.style("fill", (d) => {
			// 		if (d.properties.iso_3166_2 == "TX") return "red"
			// 		else if (d.properties.iso_3166_2 == "CA") return "blue"
			// 		else return "white"
			// 	});
				
			this.map_container_ca.selectAll(".county")
				.data(map_data_ca)
				.enter()
				.append("path")
				.classed("county", true)
				.attr("d", path_generator_ca)
				.style("fill", "blue")
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
		});
	}
}

/*For the moment we use data from serie 4 to do the scatter plot but then
it will be the hit rate */

const TEST_TEMPERATURES = [13, 18, 21, 19, 26, 25, 16];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
class ScatterPlot {
	constructor(svg_element_id, data) {
		this.data = data;
		this.svg = d3.select('#' + svg_element_id);

		console.log(this.svg);

		this.plot_area = this.svg.append('g')
			.attr('x', 10)
			.attr('y', 10);

		this.plot_area.append('rect')
			.classed('plot-background', true)
			.attr('width', 200)
			.attr('height', 100);

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
	plot_object = new MapPlot('map-plot');
	plot_object = new MapPlot('map-plot2');
	// plot object is global, you can inspect it in the dev-console
	let data = TEST_TEMPERATURES.map((value, index) => {
		return {'x': index, 'y': value, 'name': DAYS[index]};
	});
	
	let plot = new ScatterPlot('plot', data);

});
