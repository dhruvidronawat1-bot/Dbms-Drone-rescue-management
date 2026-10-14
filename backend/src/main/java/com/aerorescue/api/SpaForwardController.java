package com.aerorescue.api;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardController {
    // Forward non-API, non-static asset routes to index.html for Single-Page Application routing
    @RequestMapping(value = {
        "/",
        "/drones",
        "/missions",
        "/victims",
        "/camps",
        "/supplies",
        "/operators",
        "/organizations",
        "/reports",
        "/dashboard"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
