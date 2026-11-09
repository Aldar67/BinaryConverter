using System.Text.Json.Serialization;
using NumberSystems.Core.Exercises;
using NumberSystems.Web.Api;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton(new ExerciseGenerator(Random.Shared));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapConversionApi();

app.Run();

// Нужен для интеграционных тестов через WebApplicationFactory.
public partial class Program;
