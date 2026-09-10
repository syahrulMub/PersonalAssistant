#stage 1 
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /src

COPY AIPersonalAssistant.csproj ./
RUN dotnet restore AIPersonalAssistant.csproj

COPY . .
RUN dotnet publish AIPersonalAssistant.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production


COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "AIPersonalAssistant.dll"]