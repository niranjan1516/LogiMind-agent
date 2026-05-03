import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def compute_distance(loc1, loc2):
    """
    Computes the distance between two coordinates. 
    Using a simple Euclidean approximation for local city distances, 
    scaled to integers as required by OR-Tools.
    """
    lat_diff = loc1["latitude"] - loc2["latitude"]
    lon_diff = loc1["longitude"] - loc2["longitude"]
    # Multiply by 100,000 to convert to a workable integer for the solver
    return int(math.sqrt(lat_diff**2 + lon_diff**2) * 100000)

def create_distance_matrix(locations):
    """Creates a 2D array representing distances between all points."""
    matrix = []
    for from_node in locations:
        row = []
        for to_node in locations:
            row.append(compute_distance(from_node, to_node))
        matrix.append(row)
    return matrix

def optimize_routes(depot_location, delivery_locations, num_vehicles):
    """
    Core OR-Tools Vehicle Routing Problem (VRP) Solver.
    """
    # Node 0 is the depot/driver start location. Following nodes are deliveries.
    all_locations = [depot_location] + delivery_locations
    
    data = {
        "distance_matrix": create_distance_matrix(all_locations),
        "num_vehicles": num_vehicles,
        "depot": 0 # The index of the starting location in the matrix
    }

    # Create the routing index manager
    manager = pywrapcp.RoutingIndexManager(
        len(data["distance_matrix"]), data["num_vehicles"], data["depot"]
    )

    # Create Routing Model
    routing = pywrapcp.RoutingModel(manager)

    # Create and register a transit callback
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data["distance_matrix"][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)

    # Define cost of each arc
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Distance constraint
    dimension_name = "Distance"
    routing.AddDimension(
        transit_callback_index,
        0,     # no slack
        3000000, # maximum distance per vehicle
        True,  # start cumul to zero
        dimension_name,
    )

    # Setting first solution heuristic
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # Solve the problem
    solution = routing.SolveWithParameters(search_parameters)

    # Parse and return the solution
    if not solution:
        return {"error": "No solution found."}

    routes = []
    for vehicle_id in range(data["num_vehicles"]):
        index = routing.Start(vehicle_id)
        route = []
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            # Map back to actual coordinates (skip 0 as it's the start point)
            if node_index != 0: 
                route.append(delivery_locations[node_index - 1])
            index = solution.Value(routing.NextVar(index))
        routes.append({"vehicle_id": vehicle_id, "optimized_path": route})

    return {"status": "success", "routes": routes}